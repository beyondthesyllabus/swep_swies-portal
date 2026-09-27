# SWEP/SWIES Attendance Portal

Full-stack scan-based attendance system: **Django + DRF** backend, **React + Vite + Tailwind** frontend
(admin console, technologist scanner PWA, student self-service — one codebase, routed by role).

```
scan-attendance/
  backend/     Django REST API — registration, roster matching, cards, sessions, scans, flags, reports
  frontend/    React app — admin console + scanner PWA + student registration/self-service
  docs/        Full project documentation (all phases)
```

## Quick start

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
# open config/settings.py and switch to SQLite if you don't have Postgres set up
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_program
python manage.py runserver
```

**Frontend** (second terminal)
```bash
cd frontend
npm install
npm run dev
```

Then visit `http://localhost:5173/login` and follow the "Before first use" steps in `frontend/README.md`.

## The six phases, and where to find each one

| Phase | Backend | Frontend |
|---|---|---|
| 1. Registration | `apps/students` — `RosterReference`, `register_student`, approval endpoints | `/register`, `/admin/roster`, `/admin/registrations` |
| 2. Card issuance | `apps/students/utils/tokens.py`, `card_pdf.py` | `/admin/students` |
| 3. Session setup | `apps/core` (access grants), `apps/attendance` (sessions) | `/admin/access-requests`, `/admin/sessions` |
| 4. Scanning | `apps/attendance` — idempotent batch sync, roster prefetch | `/scanner`, `/scanner/session` |
| 5. Flags & reporting | `apps/attendance/services/flags.py`, `summary.py` | `/admin/flags`, `/admin/results` |
| 6. Lost-card recovery | `apps/students` — self-service endpoints | `/my-id` |

## Two things to do before relying on this in the field

1. **Print and scan a test card sheet** with the actual technologist phones before a full run — printer DPI and paper finish affect QR read reliability (see `docs/full-portal-documentation.md`, Section 3).
2. **Add an iOS QR fallback** — the scanner uses the native `BarcodeDetector` API, which Safari doesn't support. See the note in `frontend/README.md`.

Every other piece — registration, roster matching, card issuance, offline-capable scanning, anomaly flags, final reporting, and self-service recovery — is built and wired end to end.
