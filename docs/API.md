# Akawo API Reference

Base: `/api`. All responses are JSON:
`{ "success": true, "data": … }` on success,
`{ "success": false, "error": { "code", "message", "requestId"? } }` on
failure. Authenticated endpoints require `Authorization: Bearer <accessToken>`.

Amounts are NGN major units (numbers, ≤2 dp). Money is stored as integer
kobo internally.

## Public

| Method & path | Body / params | Notes |
| ------------- | ------------- | ----- |
| `GET /api/health` | — | liveness + `gatewayMode` |
| `GET /api/config` | — | `appName, currency, gatewayMode, faceMode, minContribution, maxContribution` |
| `POST /api/auth/register` | `{name, email, password, bvn}` | 201; returns `user, tokens, emailVerification{sent, devUrl?}`. BVN = 11 digits. Password ≥10 chars, upper+lower+number+symbol. |
| `POST /api/auth/login` | `{email, password}` | generic error (anti-enumeration); rate-limited 10/15 min per IP |
| `GET /api/auth/me` | — | current user |
| `POST /api/auth/refresh` | `{refreshToken}` | rotates the token; reusing an old one revokes the whole family |
| `POST /api/auth/logout` | `{refreshToken?}` | revokes the presented refresh token |
| `POST /api/auth/verify-email` | `{token}` | from the verification link |
| `POST /api/auth/forgot-password` | `{email}` | always returns the same message; `devResetUrl` included only in dev |
| `POST /api/auth/reset-password` | `{token, password}` | revokes all of the user's refresh tokens |
| `POST /api/payments/webhooks/paystack` | Paystack event | `Authorization: Bearer <PAYSTACK_WEBHOOK_SECRET>`; unknown references acknowledged + ignored |
| `POST /api/auth/bootstrap-admin` | `{name, email, password, bvn}` | **dev only** (`LOCAL_DEV=true`); 409 if an admin exists |

## User (authenticated)

| Method & path | Body / params | Notes |
| ------------- | ------------- | ----- |
| `GET /api/users/dashboard` | — | summary, nextContribution (+overdue), recent lists, unread count, verification state |
| `PUT /api/users/profile` | `{name?, phone?}` | strict field validation; unknown fields ignored |
| `PUT /api/users/password` | `{currentPassword, newPassword}` | `mustReauthenticate: true`; revokes all refresh tokens |
| `GET /api/contributions` | `?status&label&page` | paginated |
| `POST /api/contributions` | `{amount, dueDate?, label?, frequency?}` | dueDate defaults to today; `once`\|`monthly` |
| `GET /api/contributions/:id` | — | own only |
| `PUT /api/contributions/:id` | `{label?, dueDate?, frequency?}` | only while pending/failed |
| `DELETE /api/contributions/:id` | — | own, pending only |
| `POST /api/payments/initiate` | `{contributionId}` | only own pending contributions; 409 if one is in flight |
| `GET /api/payments/:id` | — | own only |
| `POST /api/payments/:id/charge` | `{cardNumber, expiry, cvv, name}` | mock gateway: `5396 0000 0000 0000` success, `…002` insufficient funds, `…003` blocked; other Luhn-valid + future-expiry cards succeed |
| `POST /api/payments/:id/verify` | — | re-check a pending gateway reference |
| `POST /api/payments/:id/proof` | multipart `file` | JPG/PNG/WEBP/HEIC/PDF ≤8 MB → `pending_verification` |
| `GET /api/verification/status` | — | `isVerified` + latest record |
| `GET /api/verification/history` | — | last 20 |
| `POST /api/verification/submit` | multipart `facialImage` + `livenessVideo` | face JPG/PNG/WEBP/HEIC ≤5 MB, video MP4/WEBM ≤50 MB; one pending at a time; resubmit allowed after rejection |
| `GET /api/notifications` | `?unreadOnly&limit` | |
| `GET /api/notifications/unread-count` | — | |
| `POST /api/notifications/:id/read` | — | |
| `POST /api/notifications/read-all` | — | |
| `GET /api/media/:key` | `?token=<signed>` | signed URLs are subject-scoped; the bearer identity must match the URL's subject (or be an admin) |

## Admin (role=admin)

| Method & path | Body / params | Notes |
| ------------- | ------------- | ----- |
| `GET /api/admin/stats` | — | users/contributions/payments/verifications aggregates, recent payments, top contributors, 6-month totals |
| `GET /api/admin/users` | `?q&role&verified&status&page&limit` | BVN masked to last 4 |
| `PUT /api/admin/users/:id/status` | `{status: active\|suspended}` | suspend revokes tokens; no self-suspend |
| `PUT /api/admin/users/:id/role` | `{role: user\|admin}` | no self-demotion; last admin cannot be demoted |
| `GET /api/admin/verifications` | `?status&page` | queue with user identity |
| `GET /api/admin/verifications/:id` | — | includes signed media URLs |
| `POST /api/admin/verifications/:id/approve` | — | sets `is_verified=1`, notifies + emails |
| `POST /api/admin/verifications/:id/reject` | `{reason}` | reason required; user can resubmit |
| `GET /api/admin/payments` | `?status&page` | joins user + contribution label |
| `POST /api/admin/payments/:id/proof/approve` | `{note?}` | settles the contribution |
| `POST /api/admin/payments/:id/proof/reject` | `{reason}` | user can resubmit proof or pay by card |
| `GET /api/admin/emails` | `?page` | outbox (all emails, incl. dev) |
| `GET /api/admin/audit` | `?page` | every sensitive action |

## Dev-only (LOCAL_DEV=true)

| Method & path | Notes |
| ------------- | ----- |
| `POST /api/test/reset` | deletes all rows from the 10 data tables and clears KV rate-limit keys; used by the test suite |

## Error codes (selection)

`validation` (422), `invalid_credentials` (401), `unauthorized` (401),
`forbidden` (403), `not_found` (404), `conflict` / `already_reviewed` /
`no_proof` / `not_pending` (409), `rate_limited` (429).
