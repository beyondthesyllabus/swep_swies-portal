from django.db import models
from django.conf import settings


class Level(models.Model):
    name = models.CharField(max_length=20, unique=True)  # 200, 300

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Department(models.Model):
    name = models.CharField(max_length=120, unique=True)
    code = models.CharField(max_length=20, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Activity(models.Model):
    """Registration, Participation/Registration, M1..M6, M7A-D, M8."""
    name = models.CharField(max_length=50, unique=True)
    sequence_order = models.PositiveIntegerField()

    class Meta:
        ordering = ["sequence_order"]

    def __str__(self):
        return self.name


class OperatorAccessGrant(models.Model):
    """
    A technologist requests access to run scans for a Department/Level/
    Activity; an admin grants it. Access is single-use — it clears once
    the session tied to it is closed (see attendance.Session.closed_at).
    """
    operator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="access_grants")
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    level = models.ForeignKey(Level, on_delete=models.CASCADE)
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE)
    requested_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="granted_accesses"
    )
    granted_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True, help_text="Set automatically once the session closes")

    @property
    def is_active(self):
        return self.granted_at is not None and self.revoked_at is None

    def __str__(self):
        return f"{self.operator} → {self.department}/{self.level}/{self.activity}"
