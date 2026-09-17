# Akawo — Gap Analysis

_A system-wide audit of the reconstructed platform against the product
intended by the original codebase, the business flows it implies, and
production-readiness standards. Every gap found was either closed with
code (this pass) or explicitly documented as a limitation with the reason._

## Method

1. Re-read the original (now-removed) app to extract the intended user
   stories: register (basic info → BVN → email → phone → face),
   contributions with due dates, card + proof payments, admin approval
   loops, KYC.
2. Walked every flow end-to-end on the running system (API + UI):
   register → verify email → contribute → pay (card & proof) → KYC →
   admin review → history/notifications.
3. Compared each domain against its invariants (money, authz, idempotency,
   dedupe, notification completeness, deployment safety).

Status legend: ✅ implemented & verified · 🔧 gap found → closed this
pass · ⚠ documented limitation (by design or pending external input).

## 1. Registration & identity

| Area | Status | Notes |
| ---- | ------ | ----- |
| Register: name, email, password, BVN | ✅ | Strong-password + 11-digit BVN validation; generic 409s |
| One account per BVN | 🔧→✅ | **Was missing** — a second account with the same BVN was possible. Now `409 bvn_taken`. (Email uniqueness already existed.) |
| Email verification (24 h hashed token) | ✅ | Dev link exposed only when `EXPOSE_RESET_LINKS=true` (dev only) |
| Phone number | ✅ | Optional, editable in profile (the old 5-step stepper's phone step lives here) |
| Password reset (1 h hashed token) | ✅ | Revokes all sessions on reset |
| Suspended accounts | ✅ | Can't log in; active sessions' tokens revoked; UI bounces to login |
| Real BVN network validation | ⚠ | BVN is format-checked and hashed for dedupe; live bank-network validation is not wired (no provider configured). Hook point is `hashBVN` in `worker/src/routes/auth.ts`. |

## 2. Contributions

| Area | Status | Notes |
| ---- | ------ | ----- |
| Create (₦1–₦10m, ≤2 dp, due date, label, frequency) | ✅ | dueDate defaults to today; kobo-exact |
| Edit (label/dueDate/frequency) | ✅ | Only while pending/failed |
| Delete | 🔧→✅ | **Gap closed** — deleting while a payment is in flight was possible (orphaned payment). Now `409 payment_in_flight`. |
| List + pagination | ✅ | |
| List filters | 🔧→✅ | **Gap closed** — added `?label=` search alongside `?status`; UI has both. |
| Overdue flagging | ✅ | Computed server-side (`due_date < today`) |
| **Monthly recurrence** | 🔧→✅ | **The biggest product gap** — `frequency: monthly` existed as a label but did nothing. Now settling a monthly installment atomically creates the next month's installment (same amount/label, due +1 month, clamped to today) inside the same D1 transaction, plus an `installment_scheduled` notification. |

## 3. Payments

| Area | Status | Notes |
| ---- | ------ | ----- |
| Initiate → charge (mock) → settled | ✅ | Idempotent `settlePayment` in a D1 tx |
| Mock gateway determinism | ✅ | `…0000` success, `…002` insufficient funds, `…003` blocked; Luhn + test-token exemption |
| Real Paystack mode | ⚠ | Implemented (initiate/verify/webhook) but untested against live sandbox keys — flip `GATEWAY_MODE=paystack` + secrets to activate |
| One in-flight payment per contribution | 🔧→✅ | **Gap closed** — a user could initiate several payments on the same contribution (double-payment vector). Now `409 payment_in_flight` while one is `pending`/`pending_verification`. |
| Proof-of-payment upload → admin approve/reject | ✅ | Reject requires a reason; retry by new proof or by card |
| Payment state timeline in UI | ✅ | Created → started → confirmed, with proof/decline states |
| Payment history (full list) | 🔧→✅ | **Gap closed** — only the dashboard's last 5 existed. `GET /api/payments` (paginated, with contribution labels) now powers a dedicated **History** page + "View all" link. |
| Webhooks (secret-verified) | ✅ | Unknown references acknowledged & ignored; 403 when unconfigured |

## 4. Identity verification (KYC)

| Area | Status | Notes |
| ---- | ------ | ----- |
| Face (JPG/PNG/WEBP/**HEIC** ≤5 MB) + liveness (MP4/WEBM ≤50 MB) | 🔧→✅ | HEIC face accepted now (iOS default) — previously a silent 415 for iPhone photos |
| Private R2 storage + admin review | ✅ | `pending → approved \| rejected` |
| Signed media URLs | ✅ | Subject-scoped JWTs; stranger bearer → 403 |
| User can see their own submission | 🔧→✅ | **Gap closed** — `/verification/status` now returns the user's own signed media; UI "View my submission" modal (face + video) |
| Resubmit after rejection | ✅ | One pending at a time; reason shown |
| Machine facial/liveness checks | ⚠ | `FACE_MODE=api` provider-call code exists; no provider configured → manual review is the honest default |

## 5. Notifications & reminders

| Area | Status | Notes |
| ---- | ------ | ----- |
| In-app inbox (read/read-all, unread count) | ✅ | Strict per-user isolation |
| Payment completed / proof rejected / KYC outcomes / email verified / account events | ✅ | |
| **Due-date reminders** | 🔧→✅ | **Gap closed** — none existed. New daily cron (`runDueReminders`): `contribution_due_today` + `contribution_overdue` in-app notification **and** email, deduped to one per day per type. Cron entry point exported; enable with `"cron": [{"schedule":"0 7 * * *"}]` (08:00 WAT) in prod. Dev trigger: `POST /api/test/run-cron`. |
| Recurrence notice | 🔧→✅ | `installment_scheduled` when the next monthly installment lands |

## 6. Admin console

| Area | Status | Notes |
| ---- | ------ | ----- |
| Stats, users, KYC queue, payments, outbox, audit | ✅ | |
| User guards: no self-suspend, no self-demotion, last-admin protected | ✅ | |
| User **overview** (profile + contributions + payments + KYC history) | 🔧→✅ | **Gap closed** — the `GET /admin/users/:id` API existed but had no UI. Now an "Overview" modal per user row. |
| Signed media preview + approve/reject with reason | ✅ | |
| Proof review approve/reject | ✅ | |

## 7. Frontend experience

| Area | Status | Notes |
| ---- | ------ | ----- |
| Home (cinematic, reduced-motion aware) / auth / dashboard / contribute / verify / profile / notifications | ✅ | |
| Payment history page | 🔧→✅ | Added (see §3) |
| Contribution filters in UI | 🔧→✅ | Added (see §2) |
| 404, loading states, error toasts | ✅ | |
| Accessibility (labels, focus rings, aria, reduced motion) | ✅ | |
| SEO (meta/OG/JSON-LD/robots/sitemap) | ✅ | Sitemap domain is a placeholder until deploy |

## 8. Platform & production readiness

| Area | Status | Notes |
| ---- | ------ | ----- |
| D1 self-bootstrapping + explicit migrations | ✅ | |
| Secrets via `wrangler secret put` only | ✅ | No secrets in `wrangler.jsonc` |
| `LOCAL_DEV`-gated dev endpoints (prod-safe default) | ✅ | |
| Rate limiting on all abuse-prone routes | ✅ | |
| **CI pipeline** | 🔧→✅ | **Gap closed** — none existed. `.github/workflows/ci.yml`: worker (install → typecheck → 69 tests) + frontend (install → typecheck → 5 tests → production build). |
| Vercel deployment config | ✅ | `frontend/vercel.json` + `WORKER_URL` |
| Cron trigger in prod | ⚠ | `scheduled()` is implemented; the trigger line must be added to `wrangler.jsonc` at deploy (one line, documented in `docs/SETUP.md`) |
| Live Paystack / Resend / face-API integrations | ⚠ | Code-complete, credential-gated — see `docs/SETUP.md` §2.3 |
| History rewrite of the old 91k committed `node_modules` blobs | ⚠ | Removed from the working tree/index; not rewritten in shared history |

## Verification of this pass

- `worker`: `tsc` clean · **69/69 tests** (was 64; +5 for in-flight
  initiate guard, monthly recurrence, in-flight delete guard, label
  filter, cron reminders).
- `frontend`: `tsc` clean · **5/5 tests** · production build green.
- Live curl walkthrough against `wrangler dev`: in-flight initiate 409 ·
  in-flight delete 409 · monthly installment created (due +1 month) ·
  label filter · cron run (1 due-today + 1 overdue) + same-day dedupe ·
  user's own signed KYC media fetched · payment history with labels —
  all passed.
