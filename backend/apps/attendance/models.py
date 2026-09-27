import uuid
from django.db import models
from django.conf import settings
from apps.core.models import Department, Level, Activity
from apps.students.models import Student


class Session(models.Model):
    """
    One gradeable occurrence of an Activity for a Department/Level, on a
    given date, with separate sign-in and sign-out windows.
    """
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    level = models.ForeignKey(Level, on_delete=models.CASCADE)
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE)
    held_on = models.DateField()

    sign_in_opens = models.DateTimeField()
    sign_in_closes = models.DateTimeField()
    sign_out_opens = models.DateTimeField()
    sign_out_closes = models.DateTimeField()

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-held_on"]
        unique_together = ("department", "level", "activity", "held_on")

    def __str__(self):
        return f"{self.activity} — {self.department}/{self.level} ({self.held_on})"


class Scan(models.Model):
    class Direction(models.TextChoices):
        IN = "in", "Sign in"
        OUT = "out", "Sign out"

    class Source(models.TextChoices):
        SCAN = "scan", "Scanned"
        MANUAL = "manual", "Manual entry"

    client_uuid = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="scans")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="scans")
    direction = models.CharField(max_length=3, choices=Direction.choices)
    source = models.CharField(max_length=6, choices=Source.choices, default=Source.SCAN)
    manual_reason = models.CharField(max_length=255, blank=True)

    scanned_at = models.DateTimeField(help_text="Device clock — when the student was actually at the door")
    received_at = models.DateTimeField(auto_now_add=True, help_text="Server clock — when this record arrived")
    device_id = models.CharField(max_length=100)
    operator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="scans")
    capture_path = models.ImageField(upload_to="captures/", null=True, blank=True)

    class Meta:
        # The constraint that carries the whole design: a student cannot be
        # signed in/out twice for one session. The database refuses it,
        # rather than the application having to remember to.
        unique_together = ("session", "student", "direction")
        indexes = [models.Index(fields=["session", "scanned_at"], name="scan_session_time_idx")]
        ordering = ["scanned_at"]

    def __str__(self):
        return f"{self.student.reg_no} · {self.direction} · {self.session}"


class Flag(models.Model):
    class Kind(models.TextChoices):
        BURST = "burst", "Burst — many scans in a few seconds on one device"
        MISSING_OUT = "missing_out", "Signed in, never signed out"
        ORPHAN_OUT = "orphan_out", "Signed out with no sign-in"
        SHORT_DWELL = "short_dwell", "Out minus in under threshold"
        OUT_OF_WINDOW = "out_of_window", "Outside the declared window"
        CLOCK_SKEW = "clock_skew", "Device clock looks wrong"
        MANUAL_HEAVY = "manual_heavy", "High share of manual entries this session"

    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="flags")
    scan = models.ForeignKey(Scan, on_delete=models.SET_NULL, null=True, blank=True, related_name="flags")
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True, related_name="flags")
    kind = models.CharField(max_length=20, choices=Kind.choices)
    detail = models.JSONField(default=dict, blank=True)
    raised_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="resolved_flags"
    )
    resolution = models.TextField(blank=True)

    class Meta:
        ordering = ["-raised_at"]

    @property
    def is_resolved(self):
        return self.resolved_at is not None

    def __str__(self):
        return f"[{self.kind}] {self.student} — {self.session}"
