# SWEP/SWIES Attendance Portal
### Full System Documentation — Scan-Based Architecture

**Program:** SWEP/SWIES (I & II) · **Duration:** 28 September – 22 October
**Verification model:** QR card scan + live photo check (no signature matching, no face recognition)

---

## 1. Overview

The portal verifies that each student attending SWEP personally signs in and out of every activity, without relying on signature comparison or biometric matching. A technologist scans a student's QR card at the door; the scanner immediately shows the student's name and enrolment photo, and the technologist confirms with a glance before continuing. Every scan is timestamped, attributed to a device and operator, and checked against a small set of anomaly rules — the system raises flags for a human to review, and never applies a penalty on its own.

If a student loses their card, they can recover it themselves through a self-service portal, without waiting on an admin.

---

## 2. Objectives

- Issue every enrolled student a QR card tied to their record, revocable and reissuable in one click.
- Let a technologist run a full sign-in/sign-out session from a phone browser, with or without a network connection.
- Verify identity at the point of scanning via a live photo check — not an algorithm.
- Flag anomalies (bursts, missing pairs, short dwell times, heavy manual use) for human review instead of auto-penalizing.
- Score attendance simply: a session counts if both sign-in and sign-out are recorded; otherwise it's absent.
- Produce a final per-department result (frequency %, score) at the end of the program.
- Let students recover a lost card themselves, safely, without admin involvement.

---

## 3. User Roles

| Role | Capabilities |
|---|---|
| **Admin** | Manages departments/levels/activities, imports rosters, issues/reissues cards, creates sessions, grants technologist access, reviews flags, exports final results |
| **Technologist (Operator)** | Requests access to a Department/Level/Activity, runs the scanner for their granted session, uses the manual fallback when needed |
| **Student** | No login required for attendance itself. Optional self-service login to view or recover a lost ID card |

---

## 4. System Architecture — Four Moving Parts

```
 ┌────────────┐      ┌─────────────────┐      ┌────────────┐      ┌──────────────┐
 │   Card      │ ---> │  Scanner (PWA)   │ ---> │   Server    │ ---> │  Review /     │
 │  (per       │      │  on technologist │      │  records    │      │  Register /   │
 │  student)   │      │  phone           │      │  scans      │      │  Export       │
 └────────────┘      └─────────────────┘      └────────────┘      └──────────────┘
```

1. **Card** — generated once per student from the existing roster record: a QR code containing a random, opaque token, printed alongside name, reg. number, department/level and photo.
2. **Scanner** — a web page (installable to the home screen as a PWA), opened by the technologist. Fully usable offline for the duration of a session.
3. **Server** — Django + PostgreSQL backend. Records scans idempotently, computes flags, serves the roster and register.
4. **Review** — a screen where flagged records are resolved by a human, and where the final result is generated.

---

## 5. Core Workflows

### 5.1 Enrolment (once per student)
Admin uploads the department/level roster PDF → the system parses reg. numbers and names → creates student records → **immediately issues each student a card** (random token, hashed and stored; raw token exists only on the printed card).

### 5.2 Card printing
Admin selects a Department + Level and generates a card sheet — 8 cards per A4, QR + name + reg. no. + department/level + a human-readable fallback code, with cut guides. A single test sheet should be printed and scanned with the real technologist phones before a full run, since printer DPI and paper finish affect scan reliability.

### 5.3 Session lifecycle
Admin creates a **Session**: Department + Level + Activity + date, with separate sign-in and sign-out time windows. A session must be explicitly **closed** at the end — closing it recomputes final flags and automatically clears any technologist's access grant for it.

### 5.4 Access grant (request → grant → auto-revoke)
1. Technologist opens the scanner and requests access to a Department + Level + Activity.
2. Admin grants it from the pending-requests queue.
3. The technologist can now open that session's scanner. No re-selecting Department/Level/Activity per student — it's fixed for the session.
4. Access is automatically revoked the moment the session is closed.

### 5.5 Scanning (sign-in / sign-out)
1. Technologist selects the session; the full roster (names, hashed tokens, photo thumbnails) downloads and caches locally.
2. A large IN/OUT toggle sets the current direction — colour-coded, always visible, since operator error here is the most likely data-quality problem in the system.
3. Each QR read looks up the student locally (no network required), shows their **photo and name full-screen**, and the technologist confirms the match or declines it.
4. The scan is written to a durable local queue immediately, then synced to the server in the background. A card that lingers in view for a few seconds is debounced so it isn't recorded twice.
5. A student cannot be recorded twice in the same direction for the same session — enforced by the database, not just the app.

### 5.6 Manual fallback (built in from day one, not bolted on)
If a card is missing, damaged, or the camera fails: search the cached roster by name or reg. number, pick a reason (card forgotten / damaged / lost / camera failure / other), and record the scan as `manual`. It's visually distinguished in the register and counted toward a `manual_heavy` flag if it becomes the majority of a session's entries.

### 5.7 Self-service lost-card recovery
1. Student logs into a lightweight portal using reg. number + a one-time email code (no password).
2. **"View my ID"** — shows the current card, unchanged, for a card that's just misplaced.
3. **"Report lost & reissue"** — immediately revokes the old token and issues a new one, shown on screen and emailed. This closes the window on a found card being reused by someone else, and requires no admin action.

### 5.8 Flag review
After each session closes, the system computes anomaly flags (Section 7). The admin's review screen shows each flag with its underlying scan(s), the operator, device, and timestamps, and requires a recorded resolution before it's cleared. A flag is a question, never a verdict.

### 5.9 Final reporting
Admin selects Department + Level → **Final Result**: reg. no., name, sessions attended / total, frequency %, and total score, for every student — exportable as PDF or Excel.

---

## 6. Data Model

```
departments        (id, name, code)
levels              (id, name)
activities          (id, name, sequence_order)

students            (id, reg_no [unique], first_name, surname, other_names,
                      department_id, level_id, photo, email, active)
cards               (id, student_id, token_sha256 [unique, hashed only], issued_at, revoked_at)

operator_access_grants (id, operator_id, department_id, level_id, activity_id,
                         requested_at, granted_by_id, granted_at, revoked_at)

sessions            (id, department_id, level_id, activity_id, held_on,
                      sign_in_opens, sign_in_closes, sign_out_opens, sign_out_closes,
                      created_by_id, closed_at)

scans               (id, client_uuid [unique], session_id, student_id, direction [in/out],
                      source [scan/manual], manual_reason, scanned_at, received_at,
                      device_id, operator_id, capture_path)
                      UNIQUE (session_id, student_id, direction)

flags               (id, session_id, scan_id, student_id, kind, detail [json],
                      raised_at, resolved_at, resolved_by_id, resolution)
```

**The two constraints that carry the design:**
- `UNIQUE (session_id, student_id, direction)` — the database refuses a duplicate sign-in/out, rather than the application having to remember to check.
- `client_uuid UNIQUE` on scans — generated on-device before a scan leaves the phone, making offline queue retries and network hiccups impossible to turn into duplicate records.

---

## 7. Grading & Anomaly Flags

### Grading — binary, no partial credit
| Condition | Status | Marks |
|---|---|---|
| Both sign-in and sign-out recorded | **Present** | 30 |
| Either missing | **Absent** | 0 |

`Frequency % = (sessions present ÷ total sessions) × 100`

### Anomaly flags — raised, never auto-penalized
| Flag | Rule | Catches |
|---|---|---|
| `burst` | >4 scans in 6s on one device | One person scanning a stack of cards |
| `missing_out` | Signed in, never signed out | Left early, or an unrecorded exit |
| `orphan_out` | Signed out with no sign-in | Operator error, or an unmonitored entry |
| `short_dwell` | Out − in < 10 min | Signed in, left, returned at the end |
| `out_of_window` | Outside the declared window | Late arrival, or a wrong device clock |
| `clock_skew` | Received − scanned > 12h | Misconfigured phone clock |
| `manual_heavy` | >15% of a session is manual | The fallback becoming the normal path |

Thresholds should be calibrated against a few real weeks of data before any consequence is attached to them — a narrow doorway can legitimately produce a burst; a short genuine session can legitimately trip `short_dwell` on everyone.

---

## 8. Security & Privacy

- **Tokens:** random (never derived from reg. no. or name), stored only as `sha256(token)`. A database leak yields no usable credentials. Revoking and reissuing is one action.
- **HTTPS only** — a token in clear text is a reusable credential.
- **Append-only scans** — corrections are new rows referencing what they supersede, never in-place edits. This is what makes the register defensible if a student disputes a record.
- **Capture frames** (if enabled) are the most sensitive artefact and the least durable in value — delete automatically once a session's flags are resolved, or after a fixed retention window.
- **Access scoping** — technologists see only their granted sessions; photos/capture frames are visible only during an active dispute review, not browsable generally.
- **Audit log** — every flag resolution and every capture-frame view is recorded, since the people who can override the system are the ones whose actions most need to be reviewable.
- **Self-service login** — one-time email codes rather than passwords, so there's nothing long-lived to leak or forget.

### Documented, known limitations
- A student can still lend their card to a friend. The live photo check and optional capture frame reduce this; they don't eliminate it.
- A complicit operator who deliberately records absent students isn't stopped by any scanning system — the manual-entry rate and burst flags make the pattern visible over time, but the control here is organisational, not technical.

---

## 9. Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Django + Django REST Framework | Admin panel, ORM, and auth out of the box; strong PDF/image ecosystem |
| Database | PostgreSQL | Relational integrity for the constraint-heavy scan model |
| Frontend (admin + scanner) | React + Vite, installable PWA | One codebase, installable to a technologist's home screen with no app-store step |
| Offline storage | IndexedDB | Durable local scan queue and cached roster |
| QR decode | Native `BarcodeDetector` (Chrome/Android), `zxing-js`/`html5-qrcode` fallback (Safari/iOS) | Hardware-accelerated where available, covered elsewhere |
| Card/report generation | `qrcode`, `reportlab`, `openpyxl` | QR generation, printable PDFs, Excel export |
| Auth | JWT (admin/operator), one-time email code (student self-service) | Stateless API auth; no password to manage for students |

---

## 10. Non-Functional Requirements

| Requirement | Detail |
|---|---|
| Offline resilience | A full session (roster download → scanning → sync) must work with zero connectivity throughout |
| Performance | Roster payload kept near ~1MB even at 400 students, via small (~3KB) photo thumbnails |
| Auditability | Every scan, override, flag resolution and capture-frame view is logged |
| Usability | IN/OUT direction always visible and colour-coded; manual fallback always one tap away |
| Data protection | Stated purpose (attendance only), enrolment-time notice, defined retention for capture frames |

---

## 11. What's Built vs. What's Next

**Complete:** student/card schema and issuance, roster import, card-sheet PDF generation, session/scan/flag schema, the idempotent batch sync endpoint, the flag-detection service, operator access-grant workflow, final-result computation and export.

**Remaining:** the scanner PWA front end (camera decode loop, IndexedDB queue, manual fallback UI), the admin register/flag-review screens, and the self-service lost-card portal described in Section 5.7.
