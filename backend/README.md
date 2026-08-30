# Akawo Platform — Backend (Cloudflare Worker)

The API runs as a single Cloudflare Worker using:

- **D1** (SQLite) for relational storage — `users`, `contributions`, `payments`, `verifications`
- **R2** for uploaded files (payment proofs, KYC images/videos)
- **Paystack** for online payments (initiate / verify / webhook)
- **Resend** for transactional email (optional — logs to console when unconfigured)
- **Web Crypto API** for JWT (HS256) and PBKDF2-SHA256 password hashing

## Layout

```
backend/
├── wrangler.toml            # Worker + D1 + R2 bindings
├── .dev.vars.example        # local secret template (copy to .dev.vars)
├── migrations/
│   └── 0001_schema.sql      # D1 schema (also auto-applied on first request)
└── src/
    ├── index.js             # router + all route handlers
    ├── db.js                # D1 helpers + idempotent schema init
    ├── auth.js              # JWT + password hashing (Web Crypto)
    ├── paystack.js          # Paystack client + webhook signature
    ├── email.js             # Resend email client
    └── http.js              # response/CORS helpers + HttpError
```

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # set JWT_SECRET, etc.
npm run dev                      # http://localhost:8787
```

## Scripts

| Script             | Purpose                                        |
|--------------------|------------------------------------------------|
| `npm run dev`      | Run locally with `wrangler dev` (Miniflare)    |
| `npm run deploy`   | Deploy to Cloudflare                           |
| `npm run db:create`| Create the D1 database (prints its id)         |
| `npm run db:init`  | Apply schema to local D1                       |
| `npm run db:init:remote` | Apply schema to remote D1                |

## Response envelope

- Success: `{ "success": true, "data": … }` (lists add `"count"`).
- Auth success: `{ "success": true, "token": "…", "user": { … } }`.
- Error: `{ "success": false, "error": "message" }` with an appropriate HTTP status.

See [`../docs/API.md`](../docs/API.md) for every route.
