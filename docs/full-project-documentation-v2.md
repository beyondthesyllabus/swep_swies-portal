# SWEP/SWIES Attendance Portal
### Full Project Documentation — All Phases

**Program:** SWEP/SWIES (I & II) · **Duration:** 28 September – 22 October
**Verification model:** Student self-registration → roster cross-check → QR card → live photo check at scan → flagged anomaly review

---

## 1. Overview

The portal has two halves that plug into each other. **Getting a student into the system** (Phase 1) is now self-service: the student registers their own details and captures their photo, the system checks it against the official roster automatically, and an admin does one fast glance to approve rather than a full manual check. **Verifying attendance day to day** (Phases 2 onward) uses the QR-card scan model already scoped — a technologist scans a card, sees the student's name and *that same registration photo*, and confirms with a glance.

Putting registration first isn't just an ordering choice — it's what makes the daily scanning phase work at all: the enrolment photo shown at every scan comes directly from what the student captured at registration.

---

## 2. Objectives

- Let students register themselves (reg. no., department, level, name, photo) instead of an admin manually entering every record.
- Automatically check each registration against the official class list, so the admin only has to look closely at the exceptions, not every entry.
- Issue a QR card automatically the moment a registration is approved.
- Verify daily attendance with a technologist scan + live photo check — no signature matching, no face-recognition algorithm.
- Flag anomalies for human review; never auto-penalize.
- Score attendance simply — present if both sign-in and sign-out are recorded for a session, otherwise absent.
- Let a student recover a lost card themselves, without needing an admin.
- Produce a final per-department frequency/score report at the end of the program.

---

## 3. User Roles

| Role | Capabilities |
|---|---|
| **Student** | Registers their own details and photo; later, logs in to view/recover their ID card |
| **Admin** | Pre-loads the official roster, reviews/approves registrations, manages departments/levels/activities/sessions, grants technologist access, reviews flags, exports final results |
| **Technologist (Operator)** | Requests access to a session, runs the scanner, uses the manual fallback when needed |

---

## 4. The Six Phases

| Phase | What happens |
|---|---|
| **1. Registration** | Student submits their details + photo; system cross-checks the roster; admin approves |
| **2. Card issuance** | On approval, a QR card is generated automatically and made available to print/email |
| **3. Session setup** | Admin creates sessions (Department + Level + Activity + date); technologists request and are granted access |
| **4. Attendance scanning** | Technologist scans sign-in/sign-out; live photo check; manual fallback when needed |
| **5. Flag review & reporting** | Anomalies are reviewed by an admin; final frequency/score report is generated per department |
| **6. Lost-card recovery** | Student self-service portal to view or reissue their own card |

---

## 5. Phase 1 — Student Registration

### 5.1 Official roster preload (admin, done once per department/level)
Before students register, the admin uploads the official class list PDF (reg. no. + name) — the same import used previously. This becomes the reference the system checks new registrations against. It does **not** create login-ready student accounts by itself; it's just the source of truth for matching.

### 5.2 Student self-registration
A public registration page collects:
- Registration number
- Full name
- Department (dropdown)
- Level (dropdown)
- Email (used later for the one-time login code and card delivery)
- A photo, captured live via the browser's camera (`getUserMedia`) — this becomes the **enrolment photo** shown at every future scan, so it should be a clear, current, front-facing shot, not an uploaded ID photo of unknown age.

### 5.3 Automatic roster cross-check
On submission, the system looks up the typed reg. number against the preloaded official roster for that department/level:

| Outcome | What happens |
|---|---|
| ✅ Exact match found | Registration is tagged **"matches roster"** — goes to the admin's approval queue as a fast, one-glance case |
| ⚠️ No match / close-but-not-exact match | Registration still goes through (so a genuine student isn't blocked by a roster gap or typo), tagged **"needs review"** |

### 5.4 Fast admin approval
The admin's approval screen shows each pending registration with its photo, details, and match tag. Matched registrations are a one-click approve; unmatched ones are where the admin actually looks closely — checking the physical class list, correcting a typo, or contacting the student — before approving or rejecting. This keeps the admin's effort focused on the small number of cases that actually need judgment, rather than every registration.

**Completing an incomplete roster entry.** The official roster preload (Section 5.1) may only have reg. numbers for some entries, with the name column blank or missing — a common gap in real class lists. If a student registers against a reg. number that exists on the roster but has no name attached, the admin can fill in the name **directly on that roster entry**, right from the approval screen, instead of just approving the registration in isolation. Doing this:

- Completes the official roster record itself (reg. no. + the now-supplied name), so the roster is more complete going forward — not just this one registration.
- Reclassifies the pending registration from "needs review" to "matches roster," since the reg. number/name pair is now confirmed against the (now-completed) official record.
- Lets the student's verification pass through the same one-glance path as any other match, rather than being stuck as a permanent exception.

This is different from approving an unmatched registration outright: filling in the roster entry is the admin vouching for the reg. number/name pair as correct, using their own knowledge of the class list, rather than just accepting whatever the student typed.

### 5.5 On approval
- The student's record becomes active.
- A card is generated immediately (Phase 2).
- A confirmation email is sent, including the digital card / instructions to collect the printed one.

### 5.6 On rejection
- The student is notified with a reason (e.g., "reg. number not found — please confirm with your department") and can correct and resubmit.

---

## 6. Phase 2 — Card Issuance

Unchanged from the earlier card design, now triggered automatically by Phase 1 approval instead of a bulk roster import:

- A random 22-character token is generated (never derived from reg. no. or name).
- Only `sha256(token)` is stored — the raw token exists on the printed/emailed card alone.
- The card carries: QR code, name, reg. no., department/level, the registration photo, and a human-readable fallback code.
- Cards print 8 per A4 sheet with cut guides; a single test sheet should be scanned with real technologist phones before a full print run.
- Reissuing a card (admin or student self-service) revokes the old token and issues a new one in one action.

---

## 7. Phase 3 — Session Setup

- Admin creates a **Session**: Department + Level + Activity + date, with separate sign-in and sign-out time windows.
- A technologist requests access to a session; the admin grants it; access is automatically revoked the moment the session is closed.
- Closing a session also triggers final flag computation for that session (Phase 5).

---

## 8. Phase 4 — Attendance Scanning

1. Technologist opens the scanner (installable PWA), selects their granted session — the full roster (names, hashed tokens, **registration photos**) downloads and caches locally for offline use.
2. A colour-coded IN/OUT toggle sets the current direction.
3. Each QR scan looks up the student **locally, with no network required**, and shows their registration photo and name full-screen. The technologist confirms the face matches, or declines it.
4. The scan writes to a durable local queue immediately and syncs in the background — the session runs the same with or without connectivity.
5. A student cannot be recorded twice in the same direction for the same session — enforced by the database.
6. **Manual fallback**, built in from day one: if a card is missing/damaged or the camera fails, the technologist searches the cached roster by name/reg. no., picks a reason, and records the scan as `manual` — visibly marked in the register.

---

## 9. Phase 5 — Flag Review & Final Reporting

### Grading
| Condition | Status | Marks |
|---|---|---|
| Both sign-in and sign-out recorded | **Present** | 30 |
| Either missing | **Absent** | 0 |

`Frequency % = (sessions present ÷ total sessions) × 100`

### Anomaly flags (raised for review, never auto-penalized)
| Flag | Rule | Catches |
|---|---|---|
| `burst` | >4 scans in 6s on one device | One person scanning a stack of cards |
| `missing_out` | Signed in, never signed out | Left early, or an unrecorded exit |
| `orphan_out` | Signed out with no sign-in | Operator error, or unmonitored entry |
| `short_dwell` | Out − in < 10 min | Signed in, left, returned at the end |
| `out_of_window` | Outside the declared window | Late arrival, or a wrong device clock |
| `clock_skew` | Received − scanned > 12h | Misconfigured phone clock |
| `manual_heavy` | >15% of a session is manual | The fallback becoming the normal path |

### Final result
Admin selects Department + Level → **Final Result**: reg. no., name, sessions attended / total, frequency %, total score — exportable as PDF or Excel.

---

## 10. Phase 6 — Lost-Card Recovery (student self-service)

1. Student logs in with reg. number + a one-time email code (no password to manage).
2. **"View my ID"** — shows the current, unchanged card, for something just misplaced.
3. **"Report lost & reissue"** — immediately revokes the old token, issues a new one, shows it on screen and emails it. No admin step required. This closes the window on a found card being reused by someone else, at the moment the student notices it's gone.

---

## 11. Data Model

```
departments             (id, name, code)
levels                   (id, name)
activities               (id, name, sequence_order)

roster_reference         (id, department_id, level_id, reg_no, name [nullable],
                           completed_by_id, completed_at)               -- the official class list, Phase 1 source of truth;
                                                                          -- name may start blank and be filled in by an
                                                                          -- admin during approval (Section 5.4)

students                 (id, reg_no [unique], first_name, surname, other_names,
                           department_id, level_id, email, photo,
                           status [pending | approved | rejected],
                           roster_matched [bool],
                           created_at)

cards                    (id, student_id, token_sha256 [unique, hashed only],
                           issued_at, revoked_at)

operator_access_grants   (id, operator_id, department_id, level_id, activity_id,
                           requested_at, granted_by_id, granted_at, revoked_at)

sessions                 (id, department_id, level_id, activity_id, held_on,
                           sign_in_opens, sign_in_closes, sign_out_opens, sign_out_closes,
                           created_by_id, closed_at)

scans                    (id, client_uuid [unique], session_id, student_id, direction [in/out],
                           source [scan/manual], manual_reason, scanned_at, received_at,
                           device_id, operator_id, capture_path)
                           UNIQUE (session_id, student_id, direction)

flags                    (id, session_id, scan_id, student_id, kind, detail [json],
                           raised_at, resolved_at, resolved_by_id, resolution)
```

**The three constraints that carry the whole design:**
- `students.reg_no` unique — one registration per reg. number, system-wide.
- `UNIQUE (session_id, student_id, direction)` on scans — a duplicate sign-in/out is refused by the database itself.
- `client_uuid` unique on scans — generated on-device before leaving the phone, so offline queue retries can never create duplicates.

---

## 12. Security & Privacy

- **Tokens** are random, never derived from reg. no. or name, and stored only as a hash — a database leak yields no usable credentials.
- **HTTPS only** everywhere a token or photo transits.
- **Append-only scans** — corrections are new rows referencing what they supersede, never in-place edits, which is what makes the register defensible if a student disputes a record.
- **Registration photos** are personal data used for a stated purpose only (attendance verification) — students should be told this plainly at registration, per NDPA/GDPR-style expectations.
- **Access scoping** — technologists see only their granted sessions; photos are visible during scanning and dispute review only, not browsable generally.
- **Audit log** — every approval, rejection, flag resolution, and card reissue is recorded with who and when.

### Documented, known limitations
- A student can still lend their card to a friend — the live photo check reduces this but doesn't eliminate it.
- A complicit operator who deliberately records absent students isn't stopped by any scanning system; the manual-entry rate and burst flags make the pattern visible over time, but the control is organisational, not technical.
- Roster cross-matching only catches a reg. number that doesn't exist on the official list — it cannot verify that the photo submitted actually belongs to that person. That's still the admin's one-glance approval step, which is why Phase 1 keeps a human checkpoint rather than fully auto-approving.

---

## 13. Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Django + Django REST Framework | Admin panel, ORM, strong PDF/image ecosystem |
| Database | PostgreSQL | Relational integrity for the constraint-heavy scan and registration model |
| Frontend | React + Vite, installable PWA | One codebase for admin, technologist scanner, and student self-service |
| Offline storage | IndexedDB | Durable scan queue and cached roster for the scanner |
| QR decode | Native `BarcodeDetector` (Chrome/Android), `zxing-js`/`html5-qrcode` fallback (Safari/iOS) | Hardware-accelerated where available |
| Card/report generation | `qrcode`, `reportlab`, `openpyxl` | QR generation, printable card sheets, PDF/Excel export |
| Auth | JWT (admin/operator), one-time email code (student) | Stateless API auth; nothing long-lived for students to lose |

---

## 14. Build Status

| Phase | Status |
|---|---|
| 1 — Registration & roster cross-check | Documented here; not yet built |
| 2 — Card issuance | **Built** — token generation, card PDF, reissue logic |
| 3 — Session setup & access grants | **Built** |
| 4 — Attendance scanning (backend) | **Built** — sync endpoint, roster prefetch, scan model |
| 4 — Attendance scanning (scanner PWA front end) | Not yet built |
| 5 — Flag review & final reporting (backend) | **Built** — flag detection service, final-results/export |
| 5 — Flag review UI | Not yet built |
| 6 — Lost-card self-service portal | Documented; not yet built |
