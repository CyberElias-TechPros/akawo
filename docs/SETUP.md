# Akawo Platform — Setup Guide

## Prerequisites

- Node.js 18+ and npm
- A Cloudflare account (for the Worker, D1, and R2)
- A Vercel account (for the frontend)
- A Paystack account (for live payments)

## 1. Clone & install

```bash
git clone <repo-url> akawo
cd akawo

cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

## 2. Run locally

```bash
# Terminal 1 — backend
cd backend
cp .dev.vars.example .dev.vars   # set JWT_SECRET (+ ADMIN_EMAIL/ADMIN_PASSWORD for an admin)
npm run dev                       # http://localhost:8787

# Terminal 2 — frontend
cd frontend
npm start                         # http://localhost:3000
```

On first backend request, the D1 schema is created automatically and, if
`ADMIN_EMAIL`/`ADMIN_PASSWORD` are set, an admin user is bootstrapped.

## 3. Deploy the backend to Cloudflare

```bash
cd backend

# D1 database
npx wrangler d1 create akawo-db          # copy database_id → wrangler.toml

# R2 bucket
npx wrangler r2 bucket create akawo-uploads

# Secrets
npx wrangler secret put JWT_SECRET
npx wrangler secret put PAYSTACK_SECRET_KEY
# optional:
npx wrangler secret put RESEND_API_KEY

# Deploy
npx wrangler d1 execute akawo-db --remote --file=./migrations/0001_schema.sql
npm run deploy
```

Note your Worker URL (e.g. `https://akawo-backend.<subdomain>.workers.dev`).

## 4. Deploy the frontend to Vercel

1. Import the repo in Vercel.
2. Set **Root Directory** = `frontend`.
3. Framework = **Create React App** (auto-detected).
4. Edit `frontend/vercel.json` and replace `REPLACE_WITH_YOUR_WORKER.workers.dev`
   with your Worker URL.
5. Deploy.

## 5. Paystack webhook (production)

In the Paystack dashboard, set the webhook URL to:

```
https://<your-worker>.workers.dev/api/payments/webhook
```

The Worker verifies the `x-paystack-signature` header using your secret key.
