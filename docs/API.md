# Akawo Platform — API Reference

Base URL: `/api` (served by the Cloudflare Worker).

- Requests accept and return JSON unless noted (multipart for file uploads).
- Protected routes require `Authorization: Bearer <token>`.
- Admin routes additionally require the user's `role` to be `admin`.

## Auth

| Method | Path                      | Auth  | Body | Description |
|--------|---------------------------|-------|------|-------------|
| POST   | `/auth/register`          | —     | `{ name, email, password, bvn, phone? }` | Create account → `{ success, token, user }` |
| POST   | `/auth/login`             | —     | `{ email, password }` | Log in → `{ success, token, user }` |
| POST   | `/auth/logout`            | —     | —    | Stateless logout (client discards token) |
| GET    | `/auth/me`                | ✅    | —    | Current user → `{ success, data }` |
| POST   | `/auth/forgot-password`   | —     | `{ email }` | Sends a reset link (always 200 to avoid enumeration) |
| POST   | `/auth/reset-password`    | —     | `{ token, password }` | Reset password |

## Users

| Method | Path            | Auth | Description |
|--------|-----------------|------|-------------|
| GET    | `/users/me`      | ✅   | Current user |
| GET    | `/users/profile` | ✅   | Current user profile |
| GET    | `/users/dashboard` | ✅ | `{ totalContributions, currentBalance, pendingAmount, contributionCount, recentContributions, recentPayments }` |

## Contributions

| Method | Path                  | Auth | Body/Description |
|--------|-----------------------|------|------------------|
| POST   | `/contributions`      | ✅   | `{ amount }` → create (status `pending`) |
| GET    | `/contributions`      | ✅   | List the caller's contributions |
| GET    | `/contributions/:id`  | ✅   | Get one (owner only) |
| PUT    | `/contributions/:id`  | ✅   | `{ amount? }` update (owner only) |
| DELETE | `/contributions/:id`  | ✅   | Delete (owner only) |

## Payments

| Method | Path                          | Auth | Description |
|--------|-------------------------------|------|-------------|
| POST   | `/payments/initiate`          | ✅   | `{ contributionId, amount? }` → `{ payment, authorizationUrl, accessCode }` |
| POST   | `/payments/verify/:paymentId` | ✅   | Verify with Paystack, mark completed + contribution `paid` |
| POST   | `/payments/upload-proof`      | ✅   | multipart: `contributionId`, `proof` → manual proof (status `pending_verification`) |
| GET    | `/payments`                   | ✅   | List caller's payments |
| POST   | `/payments/webhook`           | —    | Paystack webhook (`charge.success`) |

## Verification (KYC)

| Method | Path                       | Auth | Description |
|--------|----------------------------|------|-------------|
| POST   | `/verification/submit`     | ✅   | multipart: `facialImage`, `livenessVideo` |
| GET    | `/verification/status`     | ✅   | Latest verification for the caller |

## Admin

| Method | Path                                  | Description |
|--------|---------------------------------------|-------------|
| GET    | `/admin/stats`                        | Aggregate counts |
| GET    | `/admin/users`                        | List users |
| GET    | `/admin/users/:userId`                | User + their contributions/payments |
| PUT    | `/admin/users/:userId/status`         | `{ isVerified }` |
| GET    | `/admin/contributions`                | List all (with user) |
| GET    | `/admin/payments`                     | List all (with user) |
| GET    | `/admin/verifications`                | List all (with user) |
| PUT    | `/admin/verifications/:id`            | `{ status: "approved" \| "rejected" }` |

## Files

| Method | Path             | Description |
|--------|------------------|-------------|
| GET    | `/files/:key`    | Stream an uploaded object from R2 |

## Health

| Method | Path       | Description |
|--------|------------|-------------|
| GET    | `/health`  | `{ success, status }` |
