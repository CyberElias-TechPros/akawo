/**
 * Dev-only email links are built server-side from FRONTEND_ORIGIN
 * (http://localhost:5173). When the app is served from a different origin
 * (live preview, staging), rewrite the link to be same-origin so it works
 * in the browser the user is actually in.
 */
export function sameOriginUrl(url: string): string {
    try {
        const u = new URL(url, window.location.origin);
        if (u.origin === window.location.origin) return url;
        return u.pathname + u.search;
    } catch {
        return url;
    }
}
