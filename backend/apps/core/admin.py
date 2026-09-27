from django.contrib import admin
from .models import Level, Department, Activity, OperatorAccessGrant

admin.site.register(Level)
admin.site.register(Department)


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ("name", "sequence_order")


@admin.register(OperatorAccessGrant)
class OperatorAccessGrantAdmin(admin.ModelAdmin):
    list_display = ("operator", "department", "level", "activity", "requested_at", "granted_at", "revoked_at")
    list_filter = ("department", "level", "activity")
    actions = ["grant_access"]

    @admin.action(description="Grant access to selected requests")
    def grant_access(self, request, queryset):
        from django.utils import timezone
        queryset.filter(granted_at__isnull=True).update(granted_at=timezone.now(), granted_by=request.user)
