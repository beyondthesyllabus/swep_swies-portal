# SWEP/SWIES Attendance System
### Approach Comparison & Recommended Architecture

---

## 1. Recommendation, upfront

**Go with Approach C — the scan-based QR card system** (the one currently being built). It's the fastest to deliver, the most technically defensible, and the least likely to be quietly abandoned by technologists mid-program. Sections 2–3 explain why against the alternatives; Section 4 adds the one gap you flagged — **letting a student recover their ID themselves if they lose it, without waiting on an admin.**

---

## 2. The three approaches, side by side

| | **A. Signature Matching** | **B. Self-Registration + Photo Approval** | **C. Scan-Based QR Card** *(recommended)* |
|---|---|---|---|
| **How identity is checked** | Algorithm compares two scanned signatures | Admin manually compares uploaded photo to a claimed identity | Technologist glances at a live photo on screen at the point of scanning |
| **Core technology** | OpenCV/SSIM image comparison | Face-capture upload + manual review queue | QR code + hashed token + roster photo |
| **Hardest technical problem** | Proving two ink strokes came from the same hand — fundamentally fuzzy, no clean threshold exists | None technically hard, but admin becomes a bottleneck at scale | None — the hardest part (identity) is delegated to a human, in person, in real time |
| **Failure mode if wrong** | False positive = an unfounded academic misconduct accusation from a floating-point score | Slow approvals bottleneck onboarding; typos/duplicate reg numbers need manual catches | A lent card is the only residual risk, and it's caught by the photo check |
| **Build effort** | High — image pipeline, thresholds calibrated per-student, ongoing tuning | Medium — registration flow + review queue + email flow | Medium, but linear and well-scoped — a 3-day plan with a demonstrable result each day |
| **Offline resilience** | None — needs the server per comparison | None | Built in — roster prefetched, scans queue locally, syncs when back online |
| **Defensibility if disputed** | Weak — "the algorithm said 52% similar" convinces no one | Reasonable — a human made the call, but with no audit trail |Strong — timestamped scan, device ID, operator ID, and a capture frame if enabled |
| **Where it can still fail** | Bad scans, natural signature variation, no defensible threshold | Admin becomes the bottleneck as volume grows | A student lends their card to a friend (mitigated, not eliminated, by the live photo check) |

---

## 3. Why Approach C wins

1. **It removes the one genuinely hard technical problem instead of trying to solve it.** Signature verification is a specialized forensic field even with clean, multiple reference samples — a phone photo of a sheet that circulated around a hall was never going to clear that bar reliably. Approach C doesn't try; it puts a human in front of a live photo instead.
2. **It fails safe.** Every anomaly (missed sign-out, suspiciously fast repeat scans, a manual-entry spike) becomes a *flag for a human to review*, never an automatic penalty. That's the difference between a system people trust and one that gets contested.
3. **It's the only one of the three with a real plan for the network being down.** SWEP venues won't always have reliable connectivity — a prefetched roster and a local scan queue mean a session runs the same whether the Wi-Fi is up or not.
4. **It has a built-in escape hatch that's designed to be used, not hidden.** The manual fallback (search by reg number, pick a reason, done) is what stops the whole system getting bypassed with a paper list in week two when a card gets damaged or a phone's camera acts up.
5. **It's the fastest to actually finish.** The 3-day plan produces something demonstrable every single day, which matters when you're evaluating against a real deadline.

**Approach B isn't a bad idea**, and elements of it (self-registration, roster cross-matching) are worth keeping for onboarding — but the *ongoing daily attendance check* is better served by Approach C's live photo glance than by a one-time upload reviewed once at registration.

---

## 4. Filling the gap: recovering a lost ID without an admin

You're right that requiring an admin every time a student misplaces their card doesn't scale. Here's how to add self-service recovery cleanly, without weakening the security model from the spec (Section 03 — tokens are random, hashed, and revocable).

### The flow

1. **Student logs into a lightweight self-service portal** using their reg. number + a one-time code sent to their registered email (no password to remember or reset — fewer support tickets than a forgotten-password flow).
2. **Portal shows their current ID card** — photo, name, reg. number, and their live QR — with two options:
   - **"Download / view my ID"** — for a card that's just misplaced, not lost, e.g. left at home for the day. No changes made; same token, same QR.
   - **"Report lost & get a new ID"** — this **revokes the old token immediately** (so a found card can't be used by someone else) and issues a fresh one on the spot, exactly like the admin's one-click reissue. The new QR is shown immediately and emailed.
3. **Either way, nothing routes through an admin.** The admin dashboard simply shows a log of self-service reissues for visibility, not for approval — consistent with the spec's principle that revoking and reissuing a card should be a one-click, low-friction action, since a bureaucratic process here is exactly what causes cards to go unreplaced and manual entries to climb.

### What this needs, technically

| Component | What it does |
|---|---|
| **Student email field** | Added to the `students` table — captured from the roster PDF if present, or collected once at first login |
| **One-time login code** | A short code emailed on login request, valid for ~10 minutes — no passwords to manage or leak |
| **Self-service reissue endpoint** | Same underlying `issue_card()` function the admin already uses — revoke old, generate new, return QR |
| **Digital card view** | A simple page rendering the QR + photo + details, downloadable as an image or PDF |
| **Audit trail entry** | Every self-service reissue logged (who, when, from what IP) — same principle as the spec's append-only scan records |

### Why revoke-and-reissue on "lost," not just reprint

If a lost card is later found by someone else, its QR still works until revoked. Making "report lost" **immediately revoke the old token** — rather than just printing a duplicate — closes that window the moment the student notices it's missing, which matters more than the convenience of keeping the same QR. This costs nothing extra to build since it reuses the reissue logic that already exists for the admin.

---

## 5. Summary

Build Approach C as planned. Add the self-service portal as a small, additive piece on top — it doesn't change the core scan/flag/register architecture at all, it just gives students a way to help themselves out of the single most common real-world failure mode (a misplaced card) without waiting on an admin or a technologist.
