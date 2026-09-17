# Contributing

## Ground rules

- **Root causes, not symptoms.** If a workaround is tempting, find the
  invariant it breaks.
- **No fake completion.** Every state the UI shows must be backed by real
  data (no hard-coded "success").
- **Server-side authorization is law.** The frontend is convenience only;
  the Worker enforces every permission.
- **Don't add infrastructure without evidence.** D1/R2/KV cover this
  product today; Durable Objects/Queues/Cron are not justified until a real
  workload needs them.
- Keep money in integer kobo below the API boundary; NGN major units above
  it.

## Branches & PRs

- Branch from `master`, small focused PRs, descriptive titles.
- A PR that touches the API must keep `worker` tests green:
  `cd worker && npx tsc --noEmit && npx vitest run`.
- A PR that touches the frontend must keep:
  `cd frontend && npx tsc --noEmit && npm test && npm run build`.

## Code style

- TypeScript strict mode in both packages (`"strict": true`).
- 4-space indent, single quotes, semicolons (match existing files).
- Worker routes follow the Hono + `AppEnv` pattern in
  `worker/src/types.ts`; helpers live in `worker/src/util/`.
- Frontend: one route per file under `src/pages/`, shared UI in
  `src/components/`, API types in `src/api/types.ts`.

## Testing

- API behaviour → integration tests in `worker/test/` driving the real
  worker over HTTP (never `SELF.DB` from tests).
- New user flows → add a spec or extend an existing one; use the helpers
  (`registerUser`, `bootstrapAdmin`, `makeContribution`, `multipart`).
- Frontend → render/flow tests in `src/test/` with a mocked `fetch`.

## Security checklist for changes

- [ ] New endpoint: rate limit if unauthenticated or abusive, `requireUser`/`adminOf` where applicable
- [ ] No user-supplied ids accepted for others' resources (IDOR)
- [ ] New DB writes: audit-log the sensitive ones
- [ ] No secrets in `wrangler.jsonc` (use `wrangler secret put`)
- [ ] Dev-only behaviour gated behind `LOCAL_DEV` (never `NODE_ENV`)
