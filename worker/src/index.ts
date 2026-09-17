import { Hono } from 'hono';
import { allowedOrigins } from './env';
import type { AppEnv } from './types';
import {
    ApiError,
    corsHeaders,
    isPreflight,
    securityHeaders,
} from './util/http';
import { randomId } from './util/crypto';
import { ensureSchema } from './db/migrate';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import contributionRoutes from './routes/contributions';
import paymentRoutes from './routes/payments';
import verificationRoutes from './routes/verification';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import mediaRoutes from './routes/media';
import testResetRoutes from './routes/testReset';

const app = new Hono<AppEnv>();

/* ------------------------------ request scope ------------------------------ */

// Ensure the schema is applied before handling any request. `ensureSchema`
// caches its work in a module-level promise, so this is a no-op after the
// first request in an isolate (and a no-op entirely in production if CI
// already ran the migrations).
app.use('*', async (c, next) => {
    await ensureSchema(c.env.DB);
    const requestId = c.req.header('x-request-id') || randomId();
    c.header('X-Request-Id', requestId);
    c.set('requestId', requestId);
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`${c.req.method} ${new URL(c.req.url).pathname} ${c.res.status} ${ms}ms req=${requestId}`);
});

/* ---------------------------------- CORS ---------------------------------- */

app.use('*', async (c, next) => {
    const headers = corsHeaders(c.req.raw, allowedOrigins(c.env));
    for (const [k, v] of Object.entries(headers)) c.header(k, v);
    if (isPreflight(c.req.raw)) {
        c.body(null, 204, headers);
    } else {
        await next();
    }
});

app.use('*', async (c, next) => {
    for (const [k, v] of Object.entries(securityHeaders())) c.header(k, v);
    await next();
});

/* --------------------------------- public --------------------------------- */

app.get('/api/health', (c) =>
    c.json({
        success: true,
        data: {
            status: 'ok',
            app: c.env.APP_NAME,
            time: new Date().toISOString(),
            gatewayMode: c.env.GATEWAY_MODE === 'paystack' ? 'paystack' : 'mock',
            mailProvider: c.env.MAIL_PROVIDER,
        },
    }),
);

/** Public, non-sensitive app configuration for the frontend. */
app.get('/api/config', (c) =>
    c.json({
        success: true,
        data: {
            appName: c.env.APP_NAME,
            currency: c.env.PAYSTACK_CURRENCY || 'NGN',
            gatewayMode: c.env.GATEWAY_MODE === 'paystack' && c.env.PAYSTACK_SECRET_KEY ? 'paystack' : 'mock',
            faceMode: c.env.FACE_MODE,
            minContribution: 1,
            maxContribution: 10_000_000,
        },
    }),
);

/* --------------------------------- routes --------------------------------- */

app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/contributions', contributionRoutes);
app.route('/api/payments', paymentRoutes);
app.route('/api/verification', verificationRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/media', mediaRoutes);
app.route('/api/test', testResetRoutes);

/* ---------------------------------- 404 ----------------------------------- */

app.notFound((c) =>
    c.json({ success: false, error: { code: 'not_found', message: 'Route not found' } }, 404),
);

/* ------------------------------- error handler ------------------------------ */

app.onError((err, c) => {
    const requestId = c.get('requestId') as string | undefined;
    if (err instanceof ApiError) {
        return c.json(
            {
                success: false,
                error: { code: err.code, message: err.message, requestId },
            },
            err.status as never,
        );
    }
    // Multipart/form-data parse errors, body limit errors, etc.
    const msg = err instanceof Error ? err.message : 'Internal server error';
    const isBody = /payload too large/i.test(msg);
    const status = isBody ? 413 : 500;
    if (status === 500) console.error(`[error] req=${requestId}`, err);
    return c.json(
        {
            success: false,
            error: {
                code: isBody ? 'payload_too_large' : 'internal_error',
                message: isBody ? 'Payload too large' : 'Something went wrong on our side. Please try again.',
                requestId,
            },
        },
        status as never,
    );
});

export default app;
