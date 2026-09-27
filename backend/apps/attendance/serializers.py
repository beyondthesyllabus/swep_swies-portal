from rest_framework import serializers
from .models import Session, Scan, Flag


class SessionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    level_name = serializers.CharField(source="level.name", read_only=True)
    activity_name = serializers.CharField(source="activity.name", read_only=True)

    class Meta:
        model = Session
        fields = [
            "id", "department", "department_name", "level", "level_name",
            "activity", "activity_name", "held_on",
            "sign_in_opens", "sign_in_closes", "sign_out_opens", "sign_out_closes", "closed_at",
        ]


class ScanSerializer(serializers.ModelSerializer):
    reg_no = serializers.CharField(source="student.reg_no", read_only=True)
    full_name = serializers.CharField(source="student.full_name", read_only=True)

    class Meta:
        model = Scan
        fields = [
            "id", "client_uuid", "session", "student", "reg_no", "full_name",
            "direction", "source", "manual_reason", "scanned_at", "received_at",
            "device_id", "operator", "capture_path",
        ]
        read_only_fields = ["received_at"]


class FlagSerializer(serializers.ModelSerializer):
    reg_no = serializers.CharField(source="student.reg_no", read_only=True, default=None)
    full_name = serializers.CharField(source="student.full_name", read_only=True, default=None)
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = Flag
        fields = [
            "id", "session", "scan", "student", "reg_no", "full_name",
            "kind", "kind_display", "detail", "raised_at",
            "resolved_at", "resolved_by", "resolution",
        ]
        read_only_fields = ["raised_at"]
