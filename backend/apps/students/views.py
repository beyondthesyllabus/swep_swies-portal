import secrets
import hashlib
from django.db import IntegrityError
from django.http import FileResponse
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from .models import Student, Card, RosterReference, LoginCode
from .serializers import (
    StudentSerializer, CardSerializer, RosterReferenceSerializer,
    StudentRegistrationSerializer, PendingStudentSerializer,
)
from .utils.roster_import import parse_roster, parse_roster_reference
from .utils.tokens import issue_card
from .utils.card_pdf import generate_card_sheet
from .utils.student_auth import issue_student_session_token, verify_student_session_token
from .utils.notifications import send_login_code_email, send_registration_status_email, send_new_card_email


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer

    def get_queryset(self):
        qs = Student.objects.select_related("department", "level").all()
        for param, field in (("department", "department_id"), ("level", "level_id")):
            value = self.request.query_params.get(param)
            if value:
                qs = qs.filter(**{field: value})
        return qs

    @action(detail=True, methods=["post"], url_path="issue-card")
    def issue_card_action(self, request, pk=None):
        """One-click reissue: revoke old token, generate new one, return the raw token for printing."""
        student = self.get_object()
        raw_token, card = issue_card(student)
        return Response({
            "card": CardSerializer(card).data,
            "raw_token": raw_token,  # only returned here, never stored
        })


@api_view(["POST"])
@parser_classes([MultiPartParser])
def import_roster(request):
    """
    POST multipart: file (PDF), department, level.
    Imports students and immediately issues each one a card.
    """
    department_id = request.data.get("department")
    level_id = request.data.get("level")
    file_obj = request.FILES.get("file")

    if not (department_id and level_id and file_obj):
        return Response({"detail": "department, level and file are required."}, status=400)

    try:
        rows = parse_roster(file_obj)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)

    imported, skipped, cards_issued = 0, 0, []
    for row in rows:
        try:
            student = Student.objects.create(
                reg_no=row["reg_no"], first_name=row["first_name"],
                surname=row["surname"], other_names=row["other_names"],
                department_id=department_id, level_id=level_id,
                status=Student.Status.APPROVED, roster_matched=True,
            )
            imported += 1
            raw_token, card = issue_card(student)
            cards_issued.append((student, raw_token))
        except IntegrityError:
            skipped += 1

    return Response({
        "students_imported": imported,
        "students_skipped": skipped,
        "message": f"Imported {imported} student(s) and issued cards. Skipped {skipped} duplicate reg. number(s).",
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def print_card_sheet(request):
    """
    GET /api/students/cards/print-sheet/?department=&level=
    Generates a fresh card (revoking old ones) for every active student in
    scope and returns one PDF sheet, 8 cards per page, ready to print.
    """
    department_id = request.query_params.get("department")
    level_id = request.query_params.get("level")
    qs = Student.objects.filter(active=True)
    if department_id:
        qs = qs.filter(department_id=department_id)
    if level_id:
        qs = qs.filter(level_id=level_id)

    pairs = []
    for student in qs:
        raw_token, _card = issue_card(student)
        pairs.append((student, raw_token))

    buffer = generate_card_sheet(pairs)
    return FileResponse(buffer, as_attachment=True, filename="card_sheet.pdf")


# ---------------------------------------------------------------------------
# Phase 1 — Roster reference (official class list) and self-registration
# ---------------------------------------------------------------------------

class RosterReferenceViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD over the official class list students are matched against.
    `name` can be blank — completing it here (see `complete` action) both
    fixes the roster and reclassifies any pending registration for that
    reg_no as a match (Section 5.4).
    """
    queryset = RosterReference.objects.select_related("department", "level").all()
    serializer_class = RosterReferenceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        for param, field in (("department", "department_id"), ("level", "level_id")):
            value = self.request.query_params.get(param)
            if value:
                qs = qs.filter(**{field: value})
        return qs

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Admin fills in the missing name on this roster entry."""
        entry = self.get_object()
        name = request.data.get("name", "").strip()
        if not name:
            return Response({"detail": "name is required."}, status=400)

        entry.name = name
        entry.completed_by = request.user
        entry.completed_at = timezone.now()
        entry.save(update_fields=["name", "completed_by", "completed_at"])

        # Any pending registration against this now-completed reg_no becomes a match.
        Student.objects.filter(
            department=entry.department, level=entry.level, reg_no__iexact=entry.reg_no,
            status=Student.Status.PENDING,
        ).update(roster_matched=True)

        return Response(RosterReferenceSerializer(entry).data)


@api_view(["POST"])
@parser_classes([MultiPartParser])
def import_roster_reference(request):
    """
    POST multipart: file (PDF), department, level.
    Loads the official class list into RosterReference — the Phase 1
    source of truth students are matched against. Does NOT create Student
    records; students create those themselves via registration.
    """
    department_id = request.data.get("department")
    level_id = request.data.get("level")
    file_obj = request.FILES.get("file")
    if not (department_id and level_id and file_obj):
        return Response({"detail": "department, level and file are required."}, status=400)

    try:
        rows = parse_roster_reference(file_obj)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=400)

    created, skipped = 0, 0
    for row in rows:
        try:
            RosterReference.objects.create(
                department_id=department_id, level_id=level_id, reg_no=row["reg_no"], name=row["name"],
            )
            created += 1
        except IntegrityError:
            skipped += 1

    return Response({
        "entries_created": created, "entries_skipped": skipped,
        "message": f"Loaded {created} roster entries. Skipped {skipped} duplicate reg. number(s).",
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser])
def register_student(request):
    """
    POST multipart: reg_no, first_name, surname, other_names, email,
    department, level, photo (captured live at registration — becomes the
    enrolment photo used at every future scan).
    Public endpoint — no login required to register.
    """
    serializer = StudentRegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        student = serializer.save()
    except IntegrityError:
        return Response({"detail": "This registration number has already been registered."}, status=409)

    return Response({
        "student": PendingStudentSerializer(student).data,
        "message": (
            "Registration received. Matched registrations are typically approved quickly; "
            "others may take a little longer while an admin checks the class list."
            if not student.roster_matched else
            "Registration received and matched against the class list — awaiting admin approval."
        ),
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_pending_registrations(request):
    """GET /api/students/registrations/pending/ — matched ones first is left to the frontend to sort/tag."""
    qs = Student.objects.filter(status=Student.Status.PENDING).select_related("department", "level")
    return Response(PendingStudentSerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def approve_registration(request, student_id):
    """Approves a pending registration, issues a card, and emails the student."""
    try:
        student = Student.objects.get(id=student_id, status=Student.Status.PENDING)
    except Student.DoesNotExist:
        return Response({"detail": "No pending registration with that id."}, status=404)

    student.status = Student.Status.APPROVED
    student.reviewed_at = timezone.now()
    student.reviewed_by = request.user
    student.save(update_fields=["status", "reviewed_at", "reviewed_by"])

    raw_token, card = issue_card(student)
    if student.email:
        send_registration_status_email(student)
        send_new_card_email(student, raw_token)

    return Response({
        "student": PendingStudentSerializer(student).data,
        "card": CardSerializer(card).data,
        "raw_token": raw_token,
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def reject_registration(request, student_id):
    try:
        student = Student.objects.get(id=student_id, status=Student.Status.PENDING)
    except Student.DoesNotExist:
        return Response({"detail": "No pending registration with that id."}, status=404)

    student.status = Student.Status.REJECTED
    student.rejection_reason = request.data.get("reason", "")
    student.reviewed_at = timezone.now()
    student.reviewed_by = request.user
    student.save(update_fields=["status", "rejection_reason", "reviewed_at", "reviewed_by"])

    if student.email:
        send_registration_status_email(student)

    return Response(PendingStudentSerializer(student).data)


# ---------------------------------------------------------------------------
# Phase 6 — Self-service lost-card recovery (no password; one-time email code)
# ---------------------------------------------------------------------------

def _generate_numeric_code():
    return f"{secrets.randbelow(1_000_000):06d}"


@api_view(["POST"])
@permission_classes([AllowAny])
def request_login_code(request):
    """POST {"reg_no": "..."} — emails a one-time code if the reg_no has an email on file."""
    reg_no = request.data.get("reg_no", "").strip()
    student = Student.objects.filter(reg_no__iexact=reg_no, status=Student.Status.APPROVED).first()

    # Same response whether or not the student/email exists — don't leak which reg. numbers are registered.
    generic_response = Response({"message": "If that registration number has an email on file, a code has been sent."})
    if not student or not student.email:
        return generic_response

    code = _generate_numeric_code()
    LoginCode.objects.create(
        student=student,
        code_hash=hashlib.sha256(code.encode()).hexdigest(),
        expires_at=timezone.now() + timedelta(minutes=settings.LOGIN_CODE_TTL_MINUTES),
    )
    send_login_code_email(student, code)
    return generic_response


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_login_code(request):
    """POST {"reg_no": "...", "code": "123456"} -> {"session_token": "..."}"""
    reg_no = request.data.get("reg_no", "").strip()
    code = request.data.get("code", "").strip()
    student = Student.objects.filter(reg_no__iexact=reg_no, status=Student.Status.APPROVED).first()
    if not student:
        return Response({"detail": "Invalid code."}, status=401)

    code_hash = hashlib.sha256(code.encode()).hexdigest()
    login_code = LoginCode.objects.filter(
        student=student, code_hash=code_hash, used_at__isnull=True, expires_at__gte=timezone.now(),
    ).order_by("-created_at").first()

    if not login_code:
        return Response({"detail": "Invalid or expired code."}, status=401)

    login_code.used_at = timezone.now()
    login_code.save(update_fields=["used_at"])

    return Response({"session_token": issue_student_session_token(student.id)})


def _student_from_session_token(request):
    token = request.headers.get("X-Student-Session", "")
    student_id = verify_student_session_token(token)
    if not student_id:
        return None
    return Student.objects.filter(id=student_id, status=Student.Status.APPROVED).first()


@api_view(["GET"])
@permission_classes([AllowAny])
def self_service_me(request):
    """
    GET, header X-Student-Session: <token from verify_login_code>.
    Returns the signed-in student's own profile and card status so the
    student portal can show an account view. Never exposes the raw card
    token (it is stored only as a hash and cannot be re-shown).
    """
    student = _student_from_session_token(request)
    if not student:
        return Response({"detail": "Your session has expired — request a new login code."}, status=401)

    card = student.cards.order_by("-issued_at").first()
    return Response({
        "reg_no": student.reg_no,
        "first_name": student.first_name,
        "surname": student.surname,
        "other_names": student.other_names,
        "email": student.email,
        "department": student.department.name if student.department else "",
        "level": student.level.name if student.level else "",
        "status": student.status,
        "card": {
            "issued_at": card.issued_at if card else None,
            "active": card.is_active if card else False,
        } if card else None,
    })


@api_view(["POST"])
@permission_classes([AllowAny])
def self_service_reissue_card(request):
    """
    POST, header X-Student-Session: <token from verify_login_code>.
    Revokes the student's current card and issues a fresh one — the only
    self-service action offered, since the raw token is never stored after
    issuance and so can't simply be "re-shown" without generating a new one.
    """
    student = _student_from_session_token(request)
    if not student:
        return Response({"detail": "Your session has expired — request a new login code."}, status=401)

    raw_token, card = issue_card(student)
    if student.email:
        send_new_card_email(student, raw_token)

    return Response({
        "card": CardSerializer(card).data,
        "raw_token": raw_token,
        "message": "Your previous card has been deactivated. This new one is now active.",
    })
