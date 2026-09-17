# Setup & Operations

Full runbook for local development and production deployment.

## 1. Local development

Prereqs: Node ≥ 20, npm.

### 1.1 API (`worker/`)

```bash
cd worker
npm install --legacy-peer-deps
npm run dev
```

`wrangler dev` starts the Worker on **http://localhost:8787** with local
D1, R2 and KV. No database step is needed: the worker applies
`migrations/0001_init.sql` itself on the first request (idempotent).

Create `.dev.vars` (gitignored) — the repository ships a ready-to-use one:

```
JWT_ACCESS_SECRET=local-dev-access-secret-change-me-0123456789
JWT_REFRESH_SECRET=local-dev-refresh-secret-change-me-0123456789
LOCAL_DEV=true
EXPOSE_RESET_LINKS=true
```

`LOCAL_DEV=true` enables the two dev-only endpoints
(`POST /api/auth/bootstrap-admin`, `POST /api/test/reset`).
`EXPOSE_RESET_LINKS=true` makes email-verification and password-reset
responses include a clickable dev link. **Both are `false` by default in
`wrangler.jsonc` and must never be set in production.**

### 1.2 Seed demo data

With the dev server running:

```bash
npm run db:seed
```

Idempotent. Creates (via the public API only):

| Account           | Password     | Notes                                  |
| ----------------- | ------------ | -------------------------------------- |
| `admin@akawo.dev` | `Akawo#Admin1` | admin, KYC-verified                   |
| `chinedu@akawo.dev` | `Akawo#Demo1` | ₦50,000 contribution **paid by card** |
| `amina@akawo.dev`   | `Akawo#Demo1` | ₦25,000 pending, email verified       |
| `tunde@akawo.dev`   | `Akawo#Demo1` | ₦12,000 pending, email verified       |

### 1.3 Frontend (`frontend/`)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173, /api proxied to :8787
```

### 1.4 Tests

```bash
cd worker   && npm test        # 64 integration tests (real worker + local D1/R2/KV)
cd frontend && npm test        # 5 render/flow tests (jsdom)
```

### 1.5 D1 studio (optional)

```bash
cd worker && npm run db:studio   # browse the local database
```

## 2. Production

### 2.1 Cloudflare (Worker + data)

1. Provision resources and wire them into `worker/wrangler.jsonc`:
   ```bash
   cd worker
   npx wrangler d1 create akawo_db
   npx wrangler r2 bucket create akawo-media
   npx wrangler kv namespace create CACHE
   ```
   Paste the returned `database_id` / `id` into `wrangler.jsonc`.
2. Apply migrations explicitly (belt-and-braces; the worker would do it):
   ```bash
   npx wrangler d1 execute akawo_db
   ```
3. Secrets (never in `wrangler.jsonc`):
   ```bash
   npx wrangler secret put JWT_ACCESS_SECRET    # ≥32 random chars
   npx wrangler secret put JWT_REFRESH_SECRET   # ≥32 random chars
   ```
   Optional:
   ```bash
   npx wrangler secret put PAYSTACK_SECRET_KEY      # + var GATEWAY_MODE=paystack
   npx wrangler secret put PAYSTACK_WEBHOOK_SECRET
   npx wrangler secret put RESEND_API_KEY           # + var MAIL_PROVIDER=resend
   ```
4. Non-secret vars to override for prod (in the dashboard or `vars`):
   - `FRONTEND_ORIGIN` = your frontend's origin (email links + CORS)
   - keep `LOCAL_DEV=false`, `EXPOSE_RESET_LINKS=false`
   - `GATEWAY_MODE=mock` works indefinitely; switch to `paystack` when ready
5. Optional but recommended — daily due-date reminders. Add to
   `wrangler.jsonc` (08:00 WAT):
   ```jsonc
   "cron": [{ "schedule": "0 7 * * *" }]
   ```
6. Deploy:
   ```bash
   npx wrangler deploy
   ```
7. **Create the first admin (one-time).** Options:
   - Temporarily set `LOCAL_DEV=true`, restart the local env or use
     `wrangler dev`, call `POST /api/auth/bootstrap-admin` with
     `{name, email, password, bvn}`, then remove the var.
   - Or insert the row directly with `wrangler d1 execute` (see
     `scripts/seed.mjs` for the exact column set; the password hash must be
     produced by the worker's scrypt-based `hashPassword`, so the
     bootstrap endpoint is the reliable path).

### 2.2 Vercel (frontend)

1. Import the repository; set the **Root Directory** to `frontend`
   (the `vercel.json` there defines build command, output and rewrites).
2. Environment variable: `WORKER_URL=https://akawo-api.<account>.workers.dev`
   (used by the `/api/*` rewrite).
3. Deploy. Update `frontend/public/sitemap.xml` (and, if you add an
   `og:url`, the meta tags) with the production domain.

### 2.3 Going live with real payments/email

- Paystack: set `GATEWAY_MODE=paystack`, `PAYSTACK_SECRET_KEY`,
  `PAYSTACK_WEBHOOK_SECRET`; point Paystack's webhook at
  `https://<worker>/api/payments/webhooks/paystack`.
- Email: set `MAIL_PROVIDER=resend` + `RESEND_API_KEY`. The outbox table
  still records every email for the admin console.

## 3. Runbook

| Task | How |
| ---- | --- |
| Verify the worker is healthy | `GET /api/health` → `{status:"ok", gatewayMode}` |
| Reset local data | `POST /api/test/reset` (dev only) — then `npm run db:seed` |
| Check what email should have gone out | Admin → Email outbox |
| Trace an action | Admin → Audit log |
| Suspend a user | Admin → Users → Suspend (revokes tokens immediately) |
| Review KYC / proof | Admin → KYC queue / Payments → Review |
