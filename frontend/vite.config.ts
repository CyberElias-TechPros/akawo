import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server mirrors production: the browser only ever talks to this origin.
// /api is proxied to the Cloudflare Worker dev server (wrangler dev, port 8787).
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: true,
        // Dev-only: accept any Host header so the sandbox/live preview
        // (https://<port>-<sandboxId>.e2b.app) can load the app.
        allowedHosts: true,
        proxy: {
            '/api': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
    },
});
