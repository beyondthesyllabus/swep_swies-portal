from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, BasePermission, SAFE_METHODS
from rest_framework.response import Response
from .models import Level, Department, Activity, OperatorAccessGrant
from .serializers import (
    LevelSerializer, DepartmentSerializer, ActivitySerializer, OperatorAccessGrantSerializer
)


class ReadOnlyOrStaff(BasePermission):
    """
    Anyone (including the unauthenticated student registration page) may READ
    reference data; only staff may create / update / delete it. This keeps the
    public Level & Department selectors working without opening writes to the
    whole internet (which a plain AllowAny on a ModelViewSet would do).
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class LevelViewSet(viewsets.ModelViewSet):
    permission_classes = [ReadOnlyOrStaff]
    queryset = Level.objects.all()
    serializer_class = LevelSerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    permission_classes = [ReadOnlyOrStaff]
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer


class ActivityViewSet(viewsets.ModelViewSet):
    permission_classes = [ReadOnlyOrStaff]
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer


class OperatorAccessGrantViewSet(viewsets.ModelViewSet):
    """
    Implements the "technologist requests access → admin grants → access
    clears after the session closes" workflow.
    """
    serializer_class = OperatorAccessGrantSerializer

    def get_queryset(self):
        qs = OperatorAccessGrant.objects.select_related("operator", "department", "level", "activity").all()
        if not self.request.user.is_staff:
            qs = qs.filter(operator=self.request.user)
        return qs

    @action(detail=False, methods=["get"])
    def my_active(self, request):
        """The technologist's current, still-open grant, if any."""
        grant = OperatorAccessGrant.objects.filter(
            operator=request.user, granted_at__isnull=False, revoked_at__isnull=True
        ).order_by("-granted_at").first()
        if not grant:
            return Response(None)
        return Response(OperatorAccessGrantSerializer(grant).data)

    @action(detail=False, methods=["get"], url_path="pending")
    def pending(self, request):
        """Admin-only: requests awaiting a grant decision."""
        if not request.user.is_staff:
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        qs = OperatorAccessGrant.objects.filter(granted_at__isnull=True).select_related(
            "operator", "department", "level", "activity"
        )
        return Response(OperatorAccessGrantSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"])
    def grant(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"detail": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)
        grant = self.get_object()
        grant.granted_at = timezone.now()
        grant.granted_by = request.user
        grant.save(update_fields=["granted_at", "granted_by"])
        return Response(OperatorAccessGrantSerializer(grant).data)

    @action(detail=True, methods=["post"])
    def revoke(self, request, pk=None):
        grant = self.get_object()
        grant.revoked_at = timezone.now()
        grant.save(update_fields=["revoked_at"])
        return Response(OperatorAccessGrantSerializer(grant).data)
