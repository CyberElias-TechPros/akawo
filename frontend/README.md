# Akawo Platform — Frontend (React)

React 18 (Create React App) + Material UI single-page application.

## Structure

```
frontend/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── favicon.svg
├── vercel.json              # Vercel rewrites (SPA + /api proxy)
└── src/
    ├── App.js               # routes + theme
    ├── index.js             # entry (ReactDOM.createRoot + Router)
    ├── setupTests.js        # @testing-library/jest-dom setup
    ├── contexts/
    │   ├── AuthContext.js   # single source of truth for auth
    │   └── NotificationContext.js
    ├── services/api.js      # axios instance (token + /api base)
    ├── hooks/useAuth.js     # re-export of the auth context
    ├── components/          # Navbar, ProtectedRoute, lists, …
    └── pages/               # Home, Login, Register, Dashboard, Payment, Admin, …
```

## Local development

```bash
npm install
npm start          # http://localhost:3000
```

The dev server proxies `/api` → `http://localhost:8787` (see `"proxy"` in
`package.json`). Start the backend (`../backend`) first.

## Build & test

```bash
npm run build      # production build → build/
npm test           # run tests (--watchAll=false for CI)
```

## Environment

| Variable            | Purpose                                             |
|---------------------|-----------------------------------------------------|
| `REACT_APP_API_URL` | API base URL (default `/api`, the same-origin proxy) |

## Deployment (Vercel)

1. Set **Root Directory** = `frontend` and framework preset = Create React App.
2. Update `vercel.json` to point `/api/:path*` at your Cloudflare Worker.
3. (Optional) set `REACT_APP_API_URL` if you skip the rewrite and call the Worker directly.
