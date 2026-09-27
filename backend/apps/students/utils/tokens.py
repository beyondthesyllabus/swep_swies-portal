"""
Card token generation — spec section 03.

Three rules, non-negotiable:
  1. Random, not derived. Never encode reg_no, name, or a sequential ID
     into the token — that would make cards forgeable in a browser.
  2. Store only sha256(token). The raw token exists on the printed card
     alone; a database leak must not yield usable credentials.
  3. Revocable. Reissuing a card revokes the old row and creates a new one.
"""
import secrets
import hashlib
from django.utils import timezone
from apps.students.models import Card

# Ambiguity-free alphabet: no 0/O, no 1/l/I — matters for the human-readable
# fallback string printed under the QR when a code is too damaged to scan.
ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
TOKEN_LENGTH = 22


def _generate_raw_token():
    raw = "".join(secrets.choice(ALPHABET) for _ in range(TOKEN_LENGTH))
    return f"attn:{raw}"


def issue_card(student):
    """
    Revokes any existing active card for this student and issues a new one.
    Returns the RAW token — the only time it will ever be available — for
    the caller to encode into a QR and print. It is never stored.
    """
    Card.objects.filter(student=student, revoked_at__isnull=True).update(revoked_at=timezone.now())

    raw_token = _generate_raw_token()
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    card = Card.objects.create(student=student, token_sha256=token_hash)
    return raw_token, card


def hash_token(raw_token):
    return hashlib.sha256(raw_token.encode()).hexdigest()
