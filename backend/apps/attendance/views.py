import base64
from io import BytesIO
from django.db import IntegrityError, transaction
from django.http import FileResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from apps.students.models import Student
from apps.core.models import OperatorAccessGrant
from .models import Session, Scan, Flag
from .serializers import SessionSerializer, ScanSerializer, FlagSerializer
from .services.flags import recompute_flags
from .services.summary import compute_student_summary
from .services.report_export import export_register_pdf, export_register_excel


class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.select_related("department", "level", "activity").all()
    serializer_class = SessionSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        """
        Closes the session, recomputes final flags, and clears the
        operator's access grant for it (spec: "access gone off after
        completing verification").
        """
        session = self.get_object()
        session.closed_at = timezone.now()
        session.save(update_fields=["closed_at"])
        recompute_flags(session)

        OperatorAccessGrant.objects.filter(
            department=session.department, level=session.level, activity=session.activity,
            revoked_at__isnull=True,
        ).update(revoked_at=timezone.now())

        return Response(SessionSerializer(session).data)

    @action(detail=True, methods=["get"])
    def roster(self, request, pk=None):
        """
        GET /api/attendance/sessions/:id/roster/
        Prefetch payload for the scanner PWA: cache this in IndexedDB so
        the whole session can run with no network connection.
        """
        session = self.get_object()
        students = Student.objects.filter(
            department=session.department, level=session.level, active=True
        ).select_related().prefetch_related("cards")

        roster = []
        for student in students:
            active_card = student.cards.filter(revoked_at__isnull=True).first()
            if not active_card:
                continue
            photo_data = None
            if student.photo:
                try:
                    with student.photo.open("rb") as f:
                        photo_data = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()
                except Exception:
                    photo_data = None
            roster.append({
                "student_id": student.id,
                "reg_no": student.reg_no,
                "name": student.full_name,
                "token_sha256": active_card.token_sha256,
                "photo": photo_data,
            })

        return Response({
            "session_id": session.id,
            "activity": session.activity.name,
            "department": session.department.name,
            "level": session.level.name,
            "sign_in_opens": session.sign_in_opens,
            "sign_in_closes": session.sign_in_closes,
            "sign_out_opens": session.sign_out_opens,
            "sign_out_closes": session.sign_out_closes,
            "students": roster,
        })

    @action(detail=True, methods=["get"])
    def register(self, request, pk=None):
        """Who signed in/out, dwell time, manual entries marked — the day's register."""
        session = self.get_object()
        students = Student.objects.filter(department=session.department, level=session.level, active=True)

        rows = []
        for student in students:
            in_scan = session.scans.filter(student=student, direction=Scan.Direction.IN).first()
            out_scan = session.scans.filter(student=student, direction=Scan.Direction.OUT).first()
            dwell_seconds = None
            if in_scan and out_scan:
                dwell_seconds = (out_scan.scanned_at - in_scan.scanned_at).total_seconds()

            rows.append({
                "student_id": student.id,
                "reg_no": student.reg_no,
                "full_name": student.full_name,
                "signed_in_at": in_scan.scanned_at if in_scan else None,
                "signed_out_at": out_scan.scanned_at if out_scan else None,
                "in_source": in_scan.source if in_scan else None,
                "out_source": out_scan.source if out_scan else None,
                "dwell_seconds": dwell_seconds,
                "status": "present" if (in_scan and out_scan) else "absent",
            })

        return Response({"session": SessionSerializer(session).data, "rows": rows})


@api_view(["POST"])
def sync_scans_batch(request):
    """
    POST /api/attendance/scans/batch/
    Body: {"scans": [{...}, ...]}
    Idempotent on client_uuid — safe to retry a failed sync or replay an
    offline queue without ever creating duplicates.
    """
    scans_payload = request.data.get("scans", [])
    accepted, rejected = [], []

    for item in scans_payload:
        client_uuid = item.get("client_uuid")
        try:
            with transaction.atomic():
                scan, created = Scan.objects.get_or_create(
                    client_uuid=client_uuid,
                    defaults=dict(
                        session_id=item["session_id"],
                        student_id=item["student_id"],
                        direction=item["direction"],
                        source=item.get("source", Scan.Source.SCAN),
                        manual_reason=item.get("manual_reason", ""),
                        scanned_at=item["scanned_at"],
                        device_id=item["device_id"],
                        operator=request.user,
                    ),
                )
            accepted.append(client_uuid)
        except IntegrityError:
            # Same (session, student, direction) already recorded under a
            # different client_uuid — a genuine duplicate-direction attempt.
            rejected.append({"client_uuid": client_uuid, "reason": "duplicate_direction"})
        except KeyError as exc:
            rejected.append({"client_uuid": client_uuid, "reason": f"missing_field:{exc}"})

    return Response({"accepted": accepted, "rejected": rejected})


class ScanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ScanSerializer

    def get_queryset(self):
        qs = Scan.objects.select_related("student").all()
        session_id = self.request.query_params.get("session")
        if session_id:
            qs = qs.filter(session_id=session_id)
        return qs


class FlagViewSet(viewsets.ModelViewSet):
    serializer_class = FlagSerializer

    def get_queryset(self):
        qs = Flag.objects.select_related("student", "session").all()
        session_id = self.request.query_params.get("session")
        unresolved_only = self.request.query_params.get("unresolved")
        if session_id:
            qs = qs.filter(session_id=session_id)
        if unresolved_only == "true":
            qs = qs.filter(resolved_at__isnull=True)
        return qs

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        flag = self.get_object()
        flag.resolved_at = timezone.now()
        flag.resolved_by = request.user
        flag.resolution = request.data.get("resolution", "")
        flag.save(update_fields=["resolved_at", "resolved_by", "resolution"])
        return Response(FlagSerializer(flag).data)


@api_view(["GET"])
def final_results(request):
    """GET /api/attendance/final-results/?department=&level="""
    department_id = request.query_params.get("department")
    level_id = request.query_params.get("level")
    if not (department_id and level_id):
        return Response({"detail": "department and level query params are required."}, status=400)

    students = Student.objects.filter(department_id=department_id, level_id=level_id, active=True)
    sessions = Session.objects.filter(department_id=department_id, level_id=level_id, closed_at__isnull=False)

    summaries = [compute_student_summary(s, sessions) for s in students]
    summaries.sort(key=lambda s: s["reg_no"])
    return Response({"count": len(summaries), "results": summaries})


@api_view(["GET"])
def export_final_results(request):
    """GET /api/attendance/final-results/export/?department=&level=&format=pdf|excel"""
    department_id = request.query_params.get("department")
    level_id = request.query_params.get("level")
    fmt = request.query_params.get("format", "pdf")
    if not (department_id and level_id):
        return Response({"detail": "department and level query params are required."}, status=400)

    students = Student.objects.filter(department_id=department_id, level_id=level_id, active=True)
    sessions = Session.objects.filter(department_id=department_id, level_id=level_id, closed_at__isnull=False)
    summaries = sorted((compute_student_summary(s, sessions) for s in students), key=lambda s: s["reg_no"])

    if fmt == "excel":
        buffer = export_register_excel(summaries)
        return FileResponse(buffer, as_attachment=True, filename="final_result.xlsx")
    buffer = export_register_pdf(summaries)
    return FileResponse(buffer, as_attachment=True, filename="final_result.pdf")
