# SWEP/SWIES Attendance Portal — Backend (Django)

## Setup

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Default DB is PostgreSQL — see `config/settings.py` to switch to SQLite for a quick local trial.

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_program        # departments, levels, activities
python manage.py runserver
```

## Endpoint map (by phase)

**Phase 1 — Registration**
| Endpoint | Purpose |
|---|---|
| `POST /api/students/roster-reference/import/` | Admin: load the official class list (reg_no + name, name may be blank) |
| `GET/POST /api/students/roster-reference/` | Admin: manage roster reference entries directly |
| `POST /api/students/roster-reference/{id}/complete/` | Admin: fill in a missing name — reclassifies matching pending registrations |
| `POST /api/students/registrations/register/` | **Public** — student self-registration (multipart, includes photo) |
| `GET /api/students/registrations/pending/` | Admin: pending queue |
| `POST /api/students/registrations/{id}/approve/` | Admin: approve — issues a card, emails the student |
| `POST /api/students/registrations/{id}/reject/` | Admin: reject with a reason |

**Phase 2 — Cards**
| Endpoint | Purpose |
|---|---|
| `POST /api/students/students/{id}/issue-card/` | Admin: one-click reissue |
| `GET /api/students/cards/print-sheet/?department=&level=` | Admin: printable card sheet PDF |
| `POST /api/students/roster/import/` | Admin bulk path: import + auto-approve + auto-issue (bypasses Phase 1 review — use for departments not using self-registration) |

**Phase 3 — Sessions & access**
| Endpoint | Purpose |
|---|---|
| `GET/POST /api/core/access-grants/` | Technologist: request access |
| `POST /api/core/access-grants/{id}/grant/` | Admin: grant |
| `GET /api/core/access-grants/my_active/` | Technologist: check current grant |
| `GET/POST /api/attendance/sessions/` | Create/list sessions |
| `POST /api/attendance/sessions/{id}/close/` | Close a session — recomputes flags, clears access grants |

**Phase 4 — Scanning**
| Endpoint | Purpose |
|---|---|
| `GET /api/attendance/sessions/{id}/roster/` | Prefetch payload for offline caching |
| `POST /api/attendance/scans/batch/` | Idempotent scan sync (by `client_uuid`) |
| `GET /api/attendance/sessions/{id}/register/` | Who signed in/out, dwell, manual entries |

**Phase 5 — Flags & reporting**
| Endpoint | Purpose |
|---|---|
| `GET /api/attendance/flags/?session=&unresolved=true` | List flags |
| `POST /api/attendance/flags/{id}/resolve/` | Resolve with a reason |
| `GET /api/attendance/final-results/?department=&level=` | Frequency/score summary |
| `GET /api/attendance/final-results/export/?department=&level=&format=pdf\|excel` | Download |

**Phase 6 — Self-service (lost card)**
| Endpoint | Purpose |
|---|---|
| `POST /api/students/self-service/request-code/` | **Public** — emails a one-time login code |
| `POST /api/students/self-service/verify-code/` | **Public** — exchanges the code for a short-lived session token |
| `POST /api/students/self-service/reissue-card/` | Student (header `X-Student-Session: <token>`) — revokes old card, issues new one |

## Important notes

- **Email:** defaults to the console backend (prints to your terminal) — set `EMAIL_BACKEND` to a real SMTP backend for production. See `config/settings.py`.
- **Raw card tokens are never stored** — only their SHA-256 hash. This is why Phase 6 self-service only offers "reissue," not "view my existing card": there's nothing stored to re-display. Reissuing is cheap and instant, so this is a deliberate trade of a little convenience for a real security property.
- **Signature-crop extraction is not part of this design** — verification here is a technologist's live photo check at scan time, not an algorithm (see the project documentation for why).
