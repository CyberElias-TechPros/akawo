# Akawo Platform

A secure, transparent savings &amp; contribution ("ajo") platform. Users register (with
Bank Verification Number — BVN), verify their identity, create contributions, and pay
via Paystack (online) or by uploading proof of payment (offline/transfer) for admin review.

This repository contains two independently deployable applications:

| App      | Location    | Stack / runtime                              | Hosting         |
|----------|-------------|----------------------------------------------|-----------------|
| Frontend | `frontend/` | React 18 (Create React App) + MUI            | **Vercel**      |
| Backend  | `backend/`  | Cloudflare Worker + D1 (SQLite) + R2 (files) | **Cloudflare**  |

---

## Architecture

```
Browser ──▶ Vercel (React SPA)
              │  /api/*  (rewrite/proxy)
              ▼
        Cloudflare Worker (akawo-backend)
              ├── D1  (users, contributions, payments, verifications)
              ├── R2  (payment proofs, KYC images/videos)
              └── Paystack (payments) + Resend (email, optional)
```

- The frontend talks to the backend over a **same-origin `/api` path**:
  - **Development** — the Create React App dev server proxies `/api` → `http://localhost:8787`.
  - **Production** — a Vercel rewrite in `frontend/vercel.json` forwards `/api/*` to the Worker.
- Authentication uses **JWT (HS256)** signed with the Web Crypto API and stored in
  `localStorage` (sent as `Authorization: Bearer …`).
- Passwords are hashed with **PBKDF2-SHA256** (Web Crypto) — no plaintext or Node crypto.

---

## Quickstart (local development)

### 1. Backend (Cloudflare Worker)

```bash
cd backend
npm install

# configure local secrets
cp .dev.vars.example .dev.vars
#   edit .dev.vars — set JWT_SECRET (and optionally ADMIN_EMAIL/ADMIN_PASSWORD,
#   PAYSTACK_SECRET_KEY, RESEND_API_KEY)

npm run dev            # wrangler dev — serves http://localhost:8787
```

The schema is created automatically on first request (idempotent), and the D1 &amp; R2
bindings are simulated locally by Miniflare. If `ADMIN_EMAIL`/`ADMIN_PASSWORD` are set,
an admin user is bootstrapped on first request.

### 2. Frontend (React)

```bash
cd frontend
npm install
npm start              # http://localhost:3000 (proxies /api → :8787)
```

### 3. Smoke test

```bash
curl http://localhost:8787/api/health
curl -X POST http://localhost:8787/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"Password1","bvn":"12345678901"}'
```

---

## Deploying

### Backend → Cloudflare Workers

```bash
cd backend
npm install

# 1. Create the D1 database and copy its database_id into wrangler.toml
npx wrangler d1 create akawo-db

# 2. Create the R2 bucket
npx wrangler r2 bucket create akawo-uploads

# 3. Set secrets
npx wrangler secret put JWT_SECRET
npx wrangler secret put PAYSTACK_SECRET_KEY

# 4. (Optional) apply the schema remotely, then deploy
npx wrangler d1 execute akawo-db --remote --file=./migrations/0001_schema.sql
npm run deploy
```

### Frontend → Vercel

1. Create a new Vercel project with **Root Directory** = `frontend`.
2. Framework preset: **Create React App** (build `npm run build`, output `build`).
3. In `frontend/vercel.json`, replace `REPLACE_WITH_YOUR_WORKER.workers.dev` with your
   Worker's domain (or a custom domain routed to it).

> Tip: if you prefer to point the frontend directly at the Worker (no Vercel rewrite),
> set the `REACT_APP_API_URL` environment variable to `https://<worker>.workers.dev/api`
> in Vercel and remove the `/api/:path*` rewrite.

---

## Environment variables

### Backend (Worker)

| Variable              | Required | Purpose                                          |
|-----------------------|----------|--------------------------------------------------|
| `JWT_SECRET`          | ✅       | Secret used to sign auth tokens                  |
| `JWT_EXPIRES_IN`      | —        | Token TTL, e.g. `30d` (default)                  |
| `PAYSTACK_SECRET_KEY` | payments | Paystack secret key                              |
| `PAYSTACK_BASE_URL`   | —        | Paystack API base (default `https://api.paystack.co`) |
| `ADMIN_EMAIL`         | —        | Bootstraps an admin account                      |
| `ADMIN_PASSWORD`      | —        | Password for the bootstrapped admin              |
| `RESEND_API_KEY`      | —        | Resend key for transactional email               |
| `FROM_EMAIL`          | —        | Sender address (default `no-reply@akawo.com`)    |
| `CORS_ORIGIN`         | —        | Allowed origin(s), comma-separated or `*`        |

### Frontend

| Variable           | Required | Purpose                                            |
|--------------------|----------|----------------------------------------------------|
| `REACT_APP_API_URL`| —        | API base (default `/api` — same-origin proxy)      |

---

## Key features

- **Auth** — register, login, logout, current user, forgot/reset password (JWT).
- **Contributions** — create/list/get/update/delete a contribution.
- **Payments** — Paystack initialization &amp; verification, manual proof-of-payment upload (R2), webhook.
- **Verification (KYC)** — upload facial image + liveness video; admin approves/rejects.
- **Admin** — stats dashboard, user management, contribution/payment/verification review.
- **Files** — uploads served from R2 via `/api/files/:key`.

See [`docs/API.md`](docs/API.md) for the full endpoint reference and
[`docs/SETUP.md`](docs/SETUP.md) for detailed environment setup.
