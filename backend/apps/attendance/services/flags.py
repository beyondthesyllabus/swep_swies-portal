"""
Anomaly flags — spec section 06. All ordinary queries over `scans`, no
machine learning. Run after each session's scans come in (or on demand
from the review screen) to (re)compute flags for that session.

A flag is a question, never a verdict — nothing here penalizes a student;
it only surfaces records for a human to look at.
"""
from datetime import timedelta
from django.conf import settings
from django.db.models import F
from django.utils import timezone
from ..models import Scan, Flag, Session


def _clear_unresolved_flags(session):
    session.flags.filter(resolved_at__isnull=True).delete()


def detect_burst(session):
    """> N scans within a short window on the same device — one person waving a stack of cards."""
    window = timedelta(seconds=settings.FLAG_BURST_WINDOW_SECONDS)
    scans = list(session.scans.filter(source=Scan.Source.SCAN).order_by("device_id", "direction", "scanned_at"))

    flags = []
    bucket = []
    for scan in scans:
        bucket = [s for s in bucket if scan.scanned_at - s.scanned_at <= window
                  and s.device_id == scan.device_id and s.direction == scan.direction]
        bucket.append(scan)
        if len(bucket) > settings.FLAG_BURST_COUNT:
            flags.append(Flag(
                session=session, scan=scan, student=scan.student, kind=Flag.Kind.BURST,
                detail={"device_id": scan.device_id, "burst_size": len(bucket)},
            ))
    return flags


def detect_missing_and_short_dwell(session):
    flags = []
    ins = {s.student_id: s for s in session.scans.filter(direction=Scan.Direction.IN)}
    outs = {s.student_id: s for s in session.scans.filter(direction=Scan.Direction.OUT)}

    for student_id, in_scan in ins.items():
        out_scan = outs.get(student_id)
        if out_scan is None:
            flags.append(Flag(
                session=session, scan=in_scan, student_id=student_id, kind=Flag.Kind.MISSING_OUT,
                detail={"signed_in_at": in_scan.scanned_at.isoformat()},
            ))
            continue
        dwell = out_scan.scanned_at - in_scan.scanned_at
        if dwell < timedelta(minutes=settings.FLAG_SHORT_DWELL_MINUTES):
            flags.append(Flag(
                session=session, scan=out_scan, student_id=student_id, kind=Flag.Kind.SHORT_DWELL,
                detail={"dwell_seconds": dwell.total_seconds()},
            ))

    for student_id, out_scan in outs.items():
        if student_id not in ins:
            flags.append(Flag(
                session=session, scan=out_scan, student_id=student_id, kind=Flag.Kind.ORPHAN_OUT,
                detail={"signed_out_at": out_scan.scanned_at.isoformat()},
            ))
    return flags


def detect_out_of_window(session):
    flags = []
    for scan in session.scans.all():
        window = (session.sign_in_opens, session.sign_in_closes) if scan.direction == Scan.Direction.IN \
            else (session.sign_out_opens, session.sign_out_closes)
        if not (window[0] <= scan.scanned_at <= window[1]):
            flags.append(Flag(
                session=session, scan=scan, student=scan.student, kind=Flag.Kind.OUT_OF_WINDOW,
                detail={"scanned_at": scan.scanned_at.isoformat(), "window": [w.isoformat() for w in window]},
            ))
    return flags


def detect_clock_skew(session):
    threshold = timedelta(hours=settings.FLAG_CLOCK_SKEW_HOURS)
    flags = []
    for scan in session.scans.all():
        gap = abs((scan.received_at - scan.scanned_at))
        if gap > threshold:
            flags.append(Flag(
                session=session, scan=scan, student=scan.student, kind=Flag.Kind.CLOCK_SKEW,
                detail={"gap_hours": gap.total_seconds() / 3600, "device_id": scan.device_id},
            ))
    return flags


def detect_manual_heavy(session):
    total = session.scans.count()
    if total == 0:
        return []
    manual = session.scans.filter(source=Scan.Source.MANUAL).count()
    if (manual / total) > settings.FLAG_MANUAL_HEAVY_RATIO:
        return [Flag(
            session=session, kind=Flag.Kind.MANUAL_HEAVY,
            detail={"manual": manual, "total": total, "ratio": round(manual / total, 2)},
        )]
    return []


def recompute_flags(session):
    """Clears unresolved flags and recomputes all of them fresh for this session."""
    _clear_unresolved_flags(session)
    new_flags = (
        detect_burst(session)
        + detect_missing_and_short_dwell(session)
        + detect_out_of_window(session)
        + detect_clock_skew(session)
        + detect_manual_heavy(session)
    )
    Flag.objects.bulk_create(new_flags)
    return new_flags
