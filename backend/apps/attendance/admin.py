from django.contrib import admin
from .models import Session, Scan, Flag


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("activity", "department", "level", "held_on", "closed_at")
    list_filter = ("department", "level", "activity")


@admin.register(Scan)
class ScanAdmin(admin.ModelAdmin):
    list_display = ("student", "session", "direction", "source", "scanned_at", "operator")
    list_filter = ("direction", "source")
    search_fields = ("student__reg_no",)


@admin.register(Flag)
class FlagAdmin(admin.ModelAdmin):
    list_display = ("kind", "student", "session", "raised_at", "resolved_at")
    list_filter = ("kind",)
