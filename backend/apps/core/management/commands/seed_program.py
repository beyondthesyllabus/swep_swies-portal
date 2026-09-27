from django.core.management.base import BaseCommand
from apps.core.models import Level, Department, Activity

DEPARTMENTS = [
    ("Mechanical Engineering", "MEC"),
    ("Computer Engineering", "CPE"),
    ("Electrical Engineering", "ELE"),
    ("Petroleum Engineering", "PET"),
    ("Chemical Engineering", "CHE"),
    ("Agricultural & Biosystems Engineering", "ABE"),
    ("Food Engineering", "FOE"),
]
LEVELS = ["200", "300"]
ACTIVITIES = [
    "Registration", "Participation/Registration",
    "M1", "M2", "M3", "M4", "M5", "M6", "M7A", "M7B", "M7C", "M7D", "M8",
]


class Command(BaseCommand):
    help = "Seeds departments, levels and activities for SWEP/SWIES."

    def handle(self, *args, **options):
        for name, code in DEPARTMENTS:
            Department.objects.get_or_create(name=name, defaults={"code": code})
        for name in LEVELS:
            Level.objects.get_or_create(name=name)
        for order, name in enumerate(ACTIVITIES, start=1):
            Activity.objects.get_or_create(name=name, defaults={"sequence_order": order})
        self.stdout.write(self.style.SUCCESS("Seeded departments, levels and activities."))
