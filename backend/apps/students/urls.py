from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework import viewsets
from .views import (
    StudentViewSet, CardSerializer, RosterReferenceViewSet,
    import_roster, import_roster_reference, print_card_sheet,
    register_student, list_pending_registrations, approve_registration, reject_registration,
    request_login_code, verify_login_code, self_service_reissue_card, self_service_me,
)
from .models import Card

router = DefaultRouter()
router.register("students", StudentViewSet, basename="student")
router.register("roster-reference", RosterReferenceViewSet, basename="rosterreference")


class CardViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Card.objects.select_related("student").all()
    serializer_class = CardSerializer


router.register("cards", CardViewSet, basename="card")

# NOTE: explicit paths MUST come before router.urls. The router's detail
# pattern (<prefix>/<pk>/) otherwise swallows these single-segment paths
# (e.g. roster-reference/import/ matched as pk="import"), returning
# 405/404 instead of reaching the intended view.
urlpatterns = [
    # Admin bulk-import paths
    path("roster/import/", import_roster, name="import-roster"),
    path("roster-reference/import/", import_roster_reference, name="import-roster-reference"),
    path("cards/print-sheet/", print_card_sheet, name="print-card-sheet"),

    # Phase 1 — public registration + admin approval
    path("registrations/register/", register_student, name="register-student"),
    path("registrations/pending/", list_pending_registrations, name="pending-registrations"),
    path("registrations/<int:student_id>/approve/", approve_registration, name="approve-registration"),
    path("registrations/<int:student_id>/reject/", reject_registration, name="reject-registration"),

    # Phase 6 — student self-service (lost-card recovery)
    path("self-service/request-code/", request_login_code, name="request-login-code"),
    path("self-service/verify-code/", verify_login_code, name="verify-login-code"),
    path("self-service/me/", self_service_me, name="self-service-me"),
    path("self-service/reissue-card/", self_service_reissue_card, name="self-service-reissue"),
] + router.urls
