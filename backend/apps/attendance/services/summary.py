"""
Per-student attendance summary: a session counts as PRESENT only if both
a sign-in and a sign-out scan exist for it; anything else is ABSENT. No
partial-credit tiers — the spec's photo-check model doesn't produce a
"mismatch" state the way signature comparison did.
"""
from django.conf import settings


def compute_student_summary(student, sessions_queryset):
    """
    sessions_queryset: the Session rows this student is expected to attend
    (i.e. Sessions for their department + level).
    """
    from ..models import Scan

    total_sessions = sessions_queryset.count()
    present_count = 0

    for session in sessions_queryset:
        has_in = Scan.objects.filter(session=session, student=student, direction=Scan.Direction.IN).exists()
        has_out = Scan.objects.filter(session=session, student=student, direction=Scan.Direction.OUT).exists()
        if has_in and has_out:
            present_count += 1

    frequency_percentage = round((present_count / total_sessions) * 100, 1) if total_sessions else 0.0
    total_score = present_count * settings.MARKS_PER_SESSION_PRESENT

    return {
        "student_id": student.id,
        "reg_no": student.reg_no,
        "full_name": student.full_name,
        "sessions_total": total_sessions,
        "sessions_present": present_count,
        "frequency_percentage": frequency_percentage,
        "total_score": total_score,
    }
