from rest_framework import serializers
from .models import Student, Card, RosterReference


class RosterReferenceSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    level_name = serializers.CharField(source="level.name", read_only=True)

    class Meta:
        model = RosterReference
        fields = ["id", "department", "department_name", "level", "level_name", "reg_no", "name",
                  "completed_by", "completed_at"]
        read_only_fields = ["completed_by", "completed_at"]


class StudentRegistrationSerializer(serializers.ModelSerializer):
    """Public self-registration — no auth required."""

    class Meta:
        model = Student
        fields = ["reg_no", "first_name", "surname", "other_names", "email", "department", "level", "photo"]

    def create(self, validated_data):
        student = Student.objects.create(**validated_data, status=Student.Status.PENDING)
        match = RosterReference.objects.filter(
            department=student.department, level=student.level, reg_no__iexact=student.reg_no,
        ).first()
        student.roster_matched = bool(match and match.name.strip())
        student.save(update_fields=["roster_matched"])
        return student


class PendingStudentSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    level_name = serializers.CharField(source="level.name", read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Student
        fields = [
            "id", "reg_no", "first_name", "surname", "other_names", "full_name", "email",
            "department", "department_name", "level", "level_name", "photo",
            "status", "roster_matched", "rejection_reason", "created_at",
        ]


class StudentSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    level_name = serializers.CharField(source="level.name", read_only=True)
    full_name = serializers.CharField(read_only=True)
    has_active_card = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            "id", "reg_no", "first_name", "surname", "other_names", "full_name",
            "department", "department_name", "level", "level_name",
            "photo", "active", "has_active_card",
        ]

    def get_has_active_card(self, obj):
        return obj.cards.filter(revoked_at__isnull=True).exists()


class CardSerializer(serializers.ModelSerializer):
    reg_no = serializers.CharField(source="student.reg_no", read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Card
        fields = ["id", "student", "reg_no", "token_sha256", "issued_at", "revoked_at", "is_active"]
        read_only_fields = ["token_sha256", "issued_at", "revoked_at"]
