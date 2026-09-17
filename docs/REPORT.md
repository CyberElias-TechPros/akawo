# Akawo — Final Report

_Autonomous reconstruction, productionization and verification. Date: 2026-09-17._

---

## A. What the product is

**Akawo** is a Nigerian savings and contribution platform. A user registers
with name, email, password and their 11-digit BVN, then:

1. **Creates contributions** — an amount (₦1.00–₦10,000,000, to the kobo)
   with a due date and optional label/frequency (`once` | `monthly`).
2. **Pays each contribution** via one of two paths:
   - **Card** — initialize a payment, charge through the gateway
     (Paystack in production, deterministic mock in dev), settle.
   - **Bank-transfer proof** — upload a screenshot; an admin reviews it and
     approves (settles) or rejects with a reason (user can resubmit or pay
     by card).
3. **Verifies identity (KYC)** — facial photo + liveness video, stored
   privately in R2, reviewed by an admin; approval flips the account to
   fully verified with notification + email.
4. **Manages the account** — dashboard, notifications inbox, profile,
   password change (which revokes every session).

An **admin console** covers platform stats, user management
(suspend/activate, promote/demote with self-action and last-admin guards),
the KYC review queue, payment proof review, the email outbox and a complete
audit log.

## B. What was found in the repository

| Area | State found |
| ---- | ----------- |
| `backend/` (Express + MongoDB) | **Unbuildable**: missing modules (`axios`, `csurf`, rate-limit, upload lib, `models/Verification.js`, `services/emailService.js`), wrong route names, `MONGODB_URI` mismatch, double `app.listen`. Security defects: verification submit trusted the client's `userId`; `GET /verification/status/:userId` was an IDOR; unvalidated admin `isVerified`; CSRF vs JWT mismatch. |
| `frontend/` (CRA + MUI) | **Unbuildable**: referenced `framer-motion` without installing it, double `BrowserRouter`, duplicate `useAuth`, calls to nonexistent endpoints, zero real CSS. |
| `database/schema.sql`, `tests/`, `verification/`, `docs/*`, root configs | 0-byte stubs. |
| Git hygiene | ~91k `node_modules` files (87 MB + 625 MB) committed to history. |

## C. Architecture decision

**Frontend: Vercel. Backend: Cloudflare Workers (D1 + R2 + KV).** No other
cloud platform introduced.

- A single Hono Worker is the whole API — D1 for all relational data, R2
  for private media, KV for rate limiting. No Postgres, Mongo, Redis, or
  object storage elsewhere; no Durable Objects, Queues or Cron because no
  workload requires them today (they are added only with evidence).
- **Money** is integer **kobo** in D1; the API and UI speak NGN major
  units (≤2 dp). No float money anywhere.
- **Frontend is same-origin in every environment** — Vite dev proxy
  locally, Vercel rewrites in production — so there is no CORS surface in
  normal operation and the browser never addresses `localhost`.

```
Browser ──https──▶ Vercel (static SPA) ──/api rewrite──▶ akawo-api.workers.dev
                        (frontend/)                    (worker/: Hono + D1 + R2 + KV)
```

## D. Backend implementation (`worker/`)

- **Auth** — register (BVN hashed with scrypt + secret, only last-4 stored
  for display), login (generic error, anti-enumeration), JWT access tokens
  (15 min) + refresh tokens (30 d) that **rotate on every use**; presenting
  a revoked token revokes the whole token family (theft detection);
  email verification (hashed 24 h tokens); forgot/reset password (hashed 1 h
  tokens, revokes all sessions on reset); logout; suspension.
- **Users** — dashboard (totals, next contribution with overdue flag,
  recent activity, unread count, verification state), profile update with
  strict field stripping, password change (revokes all refresh tokens).
- **Contributions** — CRUD with validation, IDOR guards, pagination.
- **Payments** — `pending → completed | failed` plus
  `pending_verification` for proofs; `settlePayment` is idempotent inside a
  D1 transaction (payment → contribution → audit → notification → receipt
  email). Mock gateway (deterministic test cards) and Paystack mode
  (`GATEWAY_MODE=paystack`) behind one interface; Paystack webhook verified
  with a shared secret, unknown references acknowledged and ignored.
- **KYC** — face (JPG/PNG/WEBP/HEIC ≤5 MB) + video (MP4/WEBM ≤50 MB) to R2
  under `verifications/<uid>/<vid>/`; one pending at a time; resubmit
  allowed after rejection; media served **only** through signed URLs whose
  JWT subject (`<uid>:<role>`, 15 min TTL) must match the requesting
  bearer's identity (stranger with a stolen URL → 403).
- **Notifications** — in-app inbox, unread count, read/read-all, strict
  per-user isolation.
- **Admin** — stats, users (search/filter/paginate, suspend/activate,
  promote/demote; no self-suspend, no self-demotion, last admin protected;
  suspend revokes tokens), KYC queue with signed media, proof approve
  (settles) / reject (reason required), email outbox, audit log.
- **Platform** — idempotent self-bootstrapping schema
  (`migrations/0001_init.sql` via a ledger, applied on first request and by
  `wrangler d1 execute` in CI); KV rate limits on every unauthenticated or
  abusive endpoint; security headers; strict CORS from `FRONTEND_ORIGIN`.

## E. Frontend implementation (`frontend/`)

Vite + React 18 + TypeScript + framer-motion, strict `tsc`, route-based
code splitting (~102 kB main chunk gzipped).

- **Marketing home** — cinematic hero (layered gradients, staggered
  reveals, parallax card, floating status chips), how-it-works, feature
  grid, CTA; fully `prefers-reduced-motion` aware.
- **Auth** — split-panel login/register with brand narrative;
  forgot/reset (dev shows the link, prod hides it); `/verify-email`
  auto-verifies the emailed token.
- **App** — dashboard (summary cards, next-contribution "Pay now", recent
  activity, identity + notifications side panel), contributions
  (create/edit/delete/pay with pagination), payment page (card or
  transfer-proof tabs, live state timeline, decline/retry handling),
  verification (status, submit/resubmit with client-side type & size
  validation, history), notifications inbox, profile + password change.
- **Admin** — overview, users, KYC review (media modal, approve/reject +
  reason), payments (proof review), email outbox, audit log.
- **API client** — access token in memory, refresh token in
  `localStorage`, silent rotation on 401 with one retry.
- **SEO** — title/meta/OG/Twitter, JSON-LD (`WebSite` + `Organization`),
  `robots.txt`, `sitemap.xml` (placeholder domain to swap at deploy).
- **Deployment** — `vercel.json`: static build, `/api/* → $WORKER_URL/api/*`
  rewrite, SPA fallback.

## F. Security posture

- Server-side authorization on every route (`requireUser` / `adminOf`);
  frontend gates are convenience only.
- IDOR eliminated: every resource fetch verifies ownership; admin
  endpoints verify the admin role.
- Tokens: short-lived access JWT, rotating refresh with family revocation;
  all sessions revoked on password change and on suspension.
- Secrets only via `wrangler secret put`; `wrangler.jsonc` carries no
  secrets; dev-only endpoints gated behind `LOCAL_DEV` (default `false`;
  enabled via gitignored `.dev.vars`).
- Rate limiting: register 5/h · login 10/15m · refresh 60/m · forgot 3/h
  per email · reset 5/h · bootstrap 5/h.
- Media: private R2, subject-scoped signed URLs, per-owner metadata.
- Anti-enumeration on login and password reset; audit log of every
  sensitive action.

## G. Verification (all actually performed)

| Check | Result |
| ----- | ------ |
| `worker`: `tsc --noEmit` | ✅ clean |
| `worker`: `npx vitest run` (64 integration tests across 7 specs, real worker + local D1/R2/KV, per-test reset) | ✅ **64/64** |
| `worker`: live `wrangler dev` → `npm run db:seed` → curl happy-path: login → me → dashboard → contribution → card charge → notification + email receipt → KYC submit → admin signed-media fetch → KYC approve → verified → proof upload → proof approve → refresh rotation (idempotent re-seed verified) | ✅ all steps passed |
| `frontend`: `tsc --noEmit` | ✅ clean |
| `frontend`: `npx vitest run` (home render, login success, login failure, authenticated dashboard, unauthenticated redirect) | ✅ **5/5** |
| `frontend`: `npm run build` | ✅ green, code-split per route |
| Vite dev server serving every route + proxying `/api` → Worker, verified through the live preview host | ✅ 200s across the board |
| Root cause fixes made along the way | Luhn rejecting Paystack test tokens (test-token exemption); KV/D1 state shared across tests (reset endpoint); `NODE_ENV` unset in worker env (`LOCAL_DEV` var pattern); multipart MIME loss in test helper; Hono multi-segment route for media; signed-URL subject scoping; cross-origin dev links rewritten same-origin |

## H. Deployment runbook (summary — full version in `docs/SETUP.md`)

**Cloudflare:** create D1/R2/KV → ids into `wrangler.jsonc` →
`wrangler d1 execute` → secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
optionally Paystack/Resend) → `wrangler deploy` → one-time admin bootstrap.
**Vercel:** import repo (root directory `frontend`) → set `WORKER_URL` env
→ deploy → swap the sitemap domain. Real payments: `GATEWAY_MODE=paystack`
+ webhook; real email: `MAIL_PROVIDER=resend`.

## I. Honest limitations & notes

- **Payments are mocked by default** (`GATEWAY_MODE=mock`). The Paystack
  code path (initialize/verify/webhook) is implemented and unit-shaped, but
  has not been exercised against live Paystack sandbox keys — flip
  `GATEWAY_MODE` and set the secrets to activate it.
- **KYC review is manual** (`FACE_MODE=manual`), which is the honest state:
  no facial-recognition service was configured. An API-based liveness
  provider can be wired into `FACE_MODE=api` later.
- The committed history still contains the old `node_modules` blobs (they
  are removed from the working tree and index; a history rewrite was
  deliberately not performed on a shared branch).
- `frontend/public/sitemap.xml` carries a placeholder domain until the
  production URL exists.
- The admin console assumes human review; no automation was added that the
  product does not call for.
