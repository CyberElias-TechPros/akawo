/** Cloudflare Worker bindings for the Akawo API. */
export interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    CACHE: KVNamespace;

    /**
     * 'true' only in local dev / test (set via .dev.vars, which never reaches
     * production). Gates dev-only helper endpoints (admin bootstrap, test reset).
     */
    LOCAL_DEV: string;

    APP_NAME: string;
    /** Comma-separated list of origins allowed for CORS (besides same-origin). */
    FRONTEND_ORIGIN: string;
    ACCESS_TOKEN_TTL_MIN: string;
    REFRESH_TOKEN_TTL_DAYS: string;

    /** 'mock' (default, demo gateway) | 'paystack' */
    GATEWAY_MODE: string;
    PAYSTACK_CURRENCY: string;
    PAYSTACK_SECRET_KEY?: string;
    PAYSTACK_WEBHOOK_SECRET?: string;

    /** 'outbox' (default, records emails in DB) | 'resend' */
    MAIL_PROVIDER: string;
    RESEND_API_KEY?: string;
    MAIL_FROM: string;

    /** 'manual' (default, admin reviews) | 'api' (external face/liveness provider) */
    FACE_MODE: string;
    FACE_API_URL?: string;
    FACE_API_KEY?: string;
    LIVENESS_API_URL?: string;
    LIVENESS_API_KEY?: string;

    /** When true (dev), forgot-password responses include the reset URL directly. */
    EXPOSE_RESET_LINKS: string;

    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
}

export const ACCESS_TTL_MIN = (env: Env) =>
    Math.max(5, parseInt(env.ACCESS_TOKEN_TTL_MIN || '15', 10) || 15);
export const REFRESH_TTL_DAYS = (env: Env) =>
    Math.max(1, parseInt(env.REFRESH_TOKEN_TTL_DAYS || '30', 10) || 30);

export const allowedOrigins = (env: Env): string[] =>
    (env.FRONTEND_ORIGIN || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
