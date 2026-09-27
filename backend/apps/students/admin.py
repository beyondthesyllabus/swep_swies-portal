from django.contrib import admin
from .models import Student, Card, RosterReference, LoginCode


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("reg_no", "full_name", "department", "level", "status", "roster_matched", "active")
    list_filter = ("department", "level", "status", "roster_matched", "active")
    search_fields = ("reg_no", "first_name", "surname")


@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    list_display = ("student", "issued_at", "revoked_at")
    search_fields = ("student__reg_no",)


@admin.register(RosterReference)
class RosterReferenceAdmin(admin.ModelAdmin):
    list_display = ("reg_no", "name", "department", "level", "completed_at")
    list_filter = ("department", "level")
    search_fields = ("reg_no", "name")


@admin.register(LoginCode)
class LoginCodeAdmin(admin.ModelAdmin):
    list_display = ("student", "created_at", "expires_at", "used_at")
    readonly_fields = ("code_hash",)
