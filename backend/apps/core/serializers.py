from rest_framework import serializers
from django.utils import timezone
from .models import Level, Department, Activity, OperatorAccessGrant


class LevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Level
        fields = ["id", "name"]


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "code"]


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = ["id", "name", "sequence_order"]


class OperatorAccessGrantSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    level_name = serializers.CharField(source="level.name", read_only=True)
    activity_name = serializers.CharField(source="activity.name", read_only=True)
    operator_name = serializers.CharField(source="operator.username", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = OperatorAccessGrant
        fields = [
            "id", "operator", "operator_name", "department", "department_name",
            "level", "level_name", "activity", "activity_name",
            "requested_at", "granted_at", "revoked_at", "is_active",
        ]
        read_only_fields = ["requested_at", "granted_at", "revoked_at"]

    def create(self, validated_data):
        validated_data["operator"] = self.context["request"].user
        return super().create(validated_data)
