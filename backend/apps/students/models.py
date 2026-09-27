from django.db import models
from apps.core.models import Department, Level


class RosterReference(models.Model):
    """
    The official class list, preloaded by the admin (Phase 1, Section 5.1).
    `name` may start blank — a common gap in real class lists — and be
    filled in later by an admin during registration approval (Section 5.4),
    which both completes the roster and reclassifies any pending
    registration against that reg_no as a match.
    """
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="roster_entries")
    level = models.ForeignKey(Level, on_delete=models.CASCADE, related_name="roster_entries")
    reg_no = models.CharField(max_length=40)
    name = models.CharField(max_length=200, blank=True)
    completed_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="completed_roster_entries"
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("department", "level", "reg_no")
        ordering = ["reg_no"]

    def __str__(self):
        return f"{self.reg_no} — {self.name or '(name pending)'}"


class Student(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    reg_no = models.CharField(max_length=40, unique=True)
    first_name = models.CharField(max_length=80)
    surname = models.CharField(max_length=80)
    other_names = models.CharField(max_length=80, blank=True)
    email = models.EmailField(blank=True, help_text="Used for the one-time self-service login code")
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="students")
    level = models.ForeignKey(Level, on_delete=models.CASCADE, related_name="students")
    photo = models.ImageField(
        upload_to="student_photos/", null=True, blank=True,
        help_text="Captured at self-registration — this is the enrolment photo shown at every scan",
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    roster_matched = models.BooleanField(default=False, help_text="True if reg_no matched RosterReference at registration")
    rejection_reason = models.CharField(max_length=255, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        "auth.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_students"
    )

    class Meta:
        ordering = ["reg_no"]

    @property
    def full_name(self):
        middle = f" {self.other_names}" if self.other_names else ""
        return f"{self.first_name}{middle} {self.surname}"

    def __str__(self):
        return f"{self.reg_no} — {self.full_name}"


class LoginCode(models.Model):
    """
    A one-time code emailed for self-service login (Phase 6). No student
    password ever exists — nothing long-lived to leak or forget.
    """
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="login_codes")
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"LoginCode({self.student.reg_no}, used={self.used_at is not None})"


class Card(models.Model):
    """
    A student can have only one *active* card at a time. Reissuing revokes
    the previous row rather than deleting it, so history is preserved.
    The raw token is NEVER stored — only its SHA-256 hash (see utils/tokens.py).
    """
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="cards")
    token_sha256 = models.CharField(max_length=64, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["token_sha256"], name="card_token_idx")]

    @property
    def is_active(self):
        return self.revoked_at is None

    def __str__(self):
        status = "active" if self.is_active else "revoked"
        return f"Card({self.student.reg_no}, {status})"
