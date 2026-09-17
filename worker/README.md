# Akawo API — Cloudflare Worker

TypeScript + Hono Worker backed by D1 (data), R2 (private media) and KV
(rate limiting). Money is stored as integer kobo; the API speaks NGN major
units.

## Develop

```bash
npm install --legacy-peer-deps
npm run dev            # wrangler dev on :8787 (reads .dev.vars)
npm test               # 64 integration tests (vitest pool, real worker)
npm run typecheck
npm run db:seed        # requires `npm run dev` to be running
```

`.dev.vars` (gitignored) enables `LOCAL_DEV=true`, which unlocks two
dev-only endpoints. `wrangler.jsonc` defaults both to safe production
values, so the deployed Worker never exposes them.

| Endpoint                         | Purpose                                            |
| -------------------------------- | -------------------------------------------------- |
| `POST /api/auth/bootstrap-admin` | Create the first admin (404 unless `LOCAL_DEV`)    |
| `POST /api/test/reset`           | Wipe all data tables + KV (used by the test suite) |

## Migrations

SQL lives in `migrations/` and is applied two ways:

- **Automatically** — the first request calls `ensureSchema()`, which
  applies any pending migration idempotently (ledger in `_migrations`).
  Dev and test need no manual step.
- **Explicitly** (recommended for production deploys):
  `npm run db:migrate:remote` / `npm run db:migrate:local`.

## Tests

`test/` contains 64 API-driven integration tests across 7 specs
(smoke, auth, contributions, payments, verification, admin, users) running
against the real worker with local D1/R2/KV. Storage is shared across tests
in the vitest pool, so `test/helpers.ts` resets all data + KV via the
dev-only reset endpoint before every test.

## Key design notes

- **Payments state machine**: `pending → completed | failed`, plus
  `pending_verification` when a transfer proof is uploaded.
  `settlePayment` is idempotent inside a D1 transaction (payment →
  contribution, audit, notification, receipt email).
- **Refresh tokens** rotate on every use; presenting a revoked token kills
  the whole token family (theft detection).
- **Signed media URLs** embed the *subject* (`<userId>:<role>`) in a 15-min
  JWT; the media route refuses any bearer whose identity doesn't match the
  URL's subject.
- **Rate limits** (KV): register 5/h, login 10/15m, refresh 60/m,
  forgot 3/h per email, reset 5/h, bootstrap 5/h.
- **Webhooks**: `POST /api/payments/webhooks/paystack` verifies
  `Authorization: Bearer <PAYSTACK_WEBHOOK_SECRET>`; unknown references are
  acknowledged and ignored.
