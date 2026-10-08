# Akawo Frontend

Vite + React 18 + TypeScript + framer-motion single-page app.

- Same-origin `/api` in every environment:
  - **dev** — Vite dev proxy forwards `/api` → `http://localhost:8787`
    (`wrangler dev`).
  - **prod** — Vercel rewrites `/api/*` → `$WORKER_URL/api/*`
    (`vercel.json`); set the `WORKER_URL` env var to your deployed Worker.
- Tokens: access token in memory, refresh token in `localStorage`; the API
  client silently rotates on 401 and retries once.
- Auth-gated routes via `RequireAuth` (with an `admin` variant); suspended
  accounts are bounced to the login screen.

## Commands

```bash
npm install
npm run dev          # :5173 with /api proxy
npm test             # vitest + jsdom render/flow tests
npm run build        # typecheck + production bundle → dist/
```

## Routes

| Path                       | Access  | Purpose                                   |
| -------------------------- | ------- | ----------------------------------------- |
| `/`                        | public  | Marketing home                            |
| `/login` `/register`       | public  | Auth entry                                |
| `/forgot-password`         | public  | Reset link request (dev shows the link)   |
| `/reset-password`          | public  | Set new password from token               |
| `/verify-email`            | public  | Auto-verifies the emailed token           |
| `/dashboard`               | user    | Summary, next contribution, activity      |
| `/dashboard/contributions` | user    | Create / edit / delete / pay (label + status filters) |
| `/dashboard/contribute/:id`| user    | Pay by card or upload transfer proof      |
| `/dashboard/history`       | user    | Full payment history                      |
| `/dashboard/verification`  | user    | KYC status + submit/resubmit              |
| `/dashboard/notifications` | user    | Inbox (read / read-all)                   |
| `/dashboard/profile`       | user    | Profile + password change                 |
| `/admin/*`                 | admin   | Overview, users, KYC queue, payments, outbox, audit |

## Notes

- `server.allowedHosts: true` in `vite.config.ts` is dev-only so sandbox
  preview hosts can load the app; it has no effect on the built bundle.
- `public/sitemap.xml` ships with a placeholder domain — replace it with
  your production domain after deploy.

