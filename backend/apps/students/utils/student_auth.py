"""
Student self-service uses a one-time emailed code, not a password — so
there's no student password to manage, reset, or leak. Once a code is
verified, we issue a short-lived signed token (not a full JWT/user
session) that the self-service endpoints accept to prove "this really is
student N for the next few minutes."
"""
from django.core import signing
from django.conf import settings

SALT = "swep.student-session"
SESSION_TTL_SECONDS = getattr(settings, "STUDENT_SESSION_TTL_MINUTES", 15) * 60


def issue_student_session_token(student_id):
    return signing.dumps({"student_id": student_id}, salt=SALT)


def verify_student_session_token(token):
    """Returns student_id, or None if the token is missing/expired/tampered."""
    try:
        data = signing.loads(token, salt=SALT, max_age=SESSION_TTL_SECONDS)
        return data["student_id"]
    except (signing.BadSignature, KeyError):
        return None
