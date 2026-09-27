"""
Email sending, kept in one place so swapping the backend (console -> real
SMTP) later is a one-line settings change, not a code change.
"""
from django.core.mail import send_mail
from django.conf import settings


def send_login_code_email(student, code):
    send_mail(
        subject="Your SWEP/SWIES portal login code",
        message=(
            f"Hello {student.first_name},\n\n"
            f"Your one-time login code is: {code}\n"
            f"It expires in {getattr(settings, 'LOGIN_CODE_TTL_MINUTES', 10)} minutes.\n\n"
            f"If you didn't request this, you can ignore this email."
        ),
        from_email=None,
        recipient_list=[student.email],
        fail_silently=True,
    )


def send_registration_status_email(student):
    if student.status == "approved":
        subject = "Your SWEP/SWIES registration is approved"
        message = (
            f"Hello {student.first_name},\n\n"
            f"Your registration has been approved and your ID card has been issued. "
            f"You can view or reissue it any time from the student portal.\n"
        )
    else:
        subject = "Your SWEP/SWIES registration needs attention"
        message = (
            f"Hello {student.first_name},\n\n"
            f"Your registration could not be approved as submitted. Reason: "
            f"{student.rejection_reason or 'please contact your department.'}\n"
            f"You can correct and resubmit your registration."
        )
    send_mail(subject=subject, message=message, from_email=None, recipient_list=[student.email], fail_silently=True)


def send_new_card_email(student, raw_token):
    send_mail(
        subject="Your SWEP/SWIES ID card",
        message=(
            f"Hello {student.first_name},\n\n"
            f"Here is your card token — present the QR/code below at scanning points:\n\n"
            f"{raw_token}\n\n"
            f"If you did not request this, contact your SWEP admin immediately."
        ),
        from_email=None,
        recipient_list=[student.email],
        fail_silently=True,
    )
