# Contributing

Thanks for helping improve Akawo Platform!

## Getting started

1. Follow [`SETUP.md`](SETUP.md) to run the app locally.
2. Make changes on a feature branch.
3. Run the checks before opening a pull request:

```bash
# backend — syntax/lint (no test DB required for local dev via wrangler)
cd backend && node --check src/index.js

# frontend — build + tests
cd frontend && npm run build && npm test -- --watchAll=false
```

## Code style

- Backend: ES modules, 4-space indentation, Web Crypto only (no Node.js APIs) so the
  Worker runs on Cloudflare.
- Frontend: functional components + hooks, Material UI for styling, the single
  `contexts/AuthContext` for auth state.

## Notes

- Never commit `.env`, `.dev.vars`, or any secret.
- Keep the API response envelope consistent (`{ success, data }` / `{ success, token, user }`).
