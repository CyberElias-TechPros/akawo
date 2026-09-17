# Akawo

A Nigerian savings and contribution platform. Users create contributions
(amount + due date), pay them **by card or bank-transfer proof**, and
verify their identity (facial photo + liveness video) for a fully trusted
account. An admin console covers KYC review, proof review, users,
payments, the email outbox and a full audit log.

## Architecture

```
┌────────────────────┐        ┌─────────────────────────────────────┐
│  frontend/ (Vite)  │  /api  │  worker/ (Cloudflare Worker, Hono)  │
│  React 18 + TS     │───────▶│  TypeScript, one deployable         │
│  framer-motion     │ same   │                                     │
│  Vercel (prod)     │ origin │  D1 (relational) · R2 (media) · KV  │
└────────────────────┘        │  (cache / rate limits)              │
                              └─────────────────────────────────────┘
```

- **Frontend** — Vite + React 18 + TypeScript + framer-motion. Same-origin
  `/api` everywhere: Vite dev proxy locally, Vercel rewrites in production.
- **Backend** — a single Cloudflare Worker (Hono). D1 stores all relational
  data (users, contributions, payments, verifications, notifications,
  audit, outbox). R2 stores private media (KYC face/video, payment proofs),
  served only through subject-scoped signed URLs. KV holds rate-limit state.
- **Money** — integer kobo in the database; the API speaks NGN major units
  (₦1.00 minimum, ₦10,000,000 maximum, 2 decimal places).

## Repository layout

| Path        | What it is                                                        |
| ----------- | ----------------------------------------------------------------- |
| `worker/`   | Cloudflare Worker API + migrations + seed script + 64 tests       |
| `frontend/` | Vite React SPA + Vercel config + smoke tests                      |
| `docs/`     | `SETUP.md`, `API.md`, `CONTRIBUTING.md`                           |

## Quick start (local)

```bash
# 1. API on :8787
cd worker
npm install --legacy-peer-deps
npm run dev          # wrangler dev — D1/R2/KV run locally, schema self-bootstraps

# 2. Demo data (admin + 3 users, one paid contribution)
npm run db:seed

# 3. Frontend on :5173 (proxies /api → :8787)
cd ../frontend
npm install
npm run dev
```

Open http://localhost:5173. Demo logins (password `Akawo#Demo1` for all
users, `Akawo#Admin1` for the admin): `admin@akawo.dev`,
`chinedu@akawo.dev`, `amina@akawo.dev`, `tunde@akawo.dev`.

Tests: `npm test` in `worker/` (64 integration tests) and `frontend/`
(5 render/flow tests).

## Production deployment

1. **Cloudflare** — provision the D1 database, R2 bucket and KV namespace,
   then from `worker/`:
   ```bash
   npx wrangler d1 create akawo_db          # point wrangler.jsonc at the real id
   npx wrangler r2 bucket create akawo-media
   npx wrangler kv namespace create CACHE
   npx wrangler d1 execute akawo_db         # apply migrations
   npx wrangler secret put JWT_ACCESS_SECRET   # ≥32 chars
   npx wrangler secret put JWT_REFRESH_SECRET  # ≥32 chars
   npx wrangler deploy
   ```
   Then create the first admin (one-time): temporarily set `LOCAL_DEV=true`,
   call `POST /api/auth/bootstrap-admin`, remove the var. Or insert the
   admin row directly via `wrangler d1 execute` using the seed script's SQL
   path. `EXPOSE_RESET_LINKS` stays `false` in production.
   Optional: set `GATEWAY_MODE=paystack` + `PAYSTACK_SECRET_KEY` +
   `PAYSTACK_WEBHOOK_SECRET`, and `MAIL_PROVIDER=resend` + `RESEND_API_KEY`
   for real email delivery.
2. **Vercel** — import the repo with root directory `frontend/` (or add a
   build step per `frontend/vercel.json`) and set the `WORKER_URL` env var
   to your deployed Worker URL (e.g. `https://akawo-api.<account>.workers.dev`).
   Update the domain in `frontend/public/sitemap.xml` and the
   `og:url`-style metadata if using a custom domain.
3. Set `FRONTEND_ORIGIN` on the Worker to your production frontend origin
   (used for email links and CORS).

See [`docs/SETUP.md`](docs/SETUP.md) for the full runbook and
[`docs/API.md`](docs/API.md) for the endpoint reference.
