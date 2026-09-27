# SWEP/SWIES Attendance Portal — Frontend (React + Vite + Tailwind)

One codebase, three surfaces, routed by role:

| Route | Who | What |
|---|---|---|
| `/login` | Admin & technologist | Shared sign-in, routes by role |
| `/admin/*` | Admin | Dashboard, class list, registrations, students/cards, access requests, sessions, flag review, final results |
| `/scanner`, `/scanner/session` | Technologist | Request access → select session → scan loop (installable as a PWA) |
| `/register` | Student (public) | Self-registration with live photo capture |
| `/my-id` | Student (public) | Lost-card recovery via one-time email code |

## Setup

```bash
npm install
npm run dev
```

Runs at `http://localhost:5173`, expects the Django API at `http://localhost:8000/api`
(override with `.env`: `VITE_API_URL=...`).

## Before first use

1. On the backend: `python manage.py createsuperuser`, then `python manage.py seed_program`.
2. Log in at `/login` with that superuser.
3. Load a department/level's official class list under **Class list**.
4. Have a student register at `/register`, or have an admin bulk-import via Django admin.
5. Approve the registration under **Registrations** — this issues a card.
6. A technologist logs in, requests access under `/scanner`, and an admin grants it under **Access requests**.
7. Admin creates a session under **Sessions**; technologist selects it and starts scanning.

## Important notes on the scanner

- **Camera QR decoding** uses the native `BarcodeDetector` API, available on Chrome/Android. **Safari/iOS does not support it** — swap in a `zxing-js` or `html5-qrcode` fallback in `src/pages/scanner/ScanScreen.jsx` before relying on iPhones in the field (flagged inline in that file).
- **Offline queue**: scans are written to IndexedDB immediately and synced in the background (`src/offline/sync.js`), so a session works with zero connectivity throughout — the same idea as the backend's idempotent `client_uuid` sync endpoint.
- **PWA install**: the scanner is installable to a technologist's home screen (see `vite.config.js`'s PWA plugin config). Replace the placeholder icon references (`/icon-192.png`, `/icon-512.png`) with real app icons before shipping.
- **Manual fallback** is always one tap away in the scan screen, by design — this is what stops a damaged card or a camera failure from blocking a whole session.

## Design notes

Same visual system as the rest of the project: ink navy / paper / teal palette, Source Serif 4 + IBM Plex Sans/Mono, the "title block" selector strip on admin screens. The scanner screen intentionally breaks from this into a dark, high-contrast full-screen layout — it needs to be legible outdoors and readable at a glance, which matters more there than visual consistency with the admin console.
