import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppEnv } from '../types';
import {
    first,
    run,
    tx,
} from '../db';
import {
    hashBVN,
    hashPassword,
    randomId,
    randomToken,
    sha256Hex,
    verifyPassword,
} from '../util/crypto';
import {
    isBVN,
    isEmail,
    isName,
    isPhone,
    isStrongPassword,
} from '../util/validate';
import { ApiError, INVALID_CREDENTIALS, rateLimit } from '../util/http';
import { nowIso } from '../util/format';
import { 
    issueTokens,
    publicUser,
    requireUser,
    revokeRefreshToken,
    rotateRefreshToken,
    type UserRow,
    userOf, } from '../auth';
import { audit, notify } from '../services/notify';
import { sendEmail } from '../services/mail';

const EMAIL_VERIFY_TTL_MS = 24 * 3600 * 1000;
const PASSWORD_RESET_TTL_MS = 3600 * 1000;

const app = new Hono<AppEnv>();

const clientIp = (c: Context<AppEnv>): string =>
    c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'local';

/* -------------------------------- register -------------------------------- */

app.post('/register', async (c) => {
    const ip = clientIp(c);
    const rl = await rateLimit(c.env.CACHE, `reg:${ip}`, 5, 3600);
    if (!rl.ok) throw ApiError.tooMany('Too many registration attempts, please try again later');

    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') throw ApiError.badRequest('Invalid request body');

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = body.password;
    const bvn = typeof body.bvn === 'string' ? body.bvn : '';
    const phone = body.phone ? String(body.phone) : undefined;

    const errors: string[] = [];
    if (!isName(name)) errors.push('Please enter your full name (2–120 characters)');
    if (!isEmail(email)) errors.push('Please enter a valid email address');
    if (!isStrongPassword(password))
        errors.push('Password must be at least 8 characters and include a letter and a number');
    if (!isBVN(bvn)) errors.push('BVN must be exactly 11 digits');
    if (phone !== undefined && !isPhone(phone)) errors.push('Please enter a valid phone number');
    if (errors.length) throw new ApiError(422, errors.join(' '), 'validation');

    const bvnDigits = bvn.replace(/\s+/g, '');
    const bvnHash = await hashBVN(bvnDigits, c.env.JWT_ACCESS_SECRET);

    const existingEmail = await first(c.env.DB, `SELECT id FROM users WHERE email = ?`, email);
    if (existingEmail) throw ApiError.conflict('An account with this email already exists', 'email_taken');
    const existingBvn = await first(c.env.DB, `SELECT id FROM users WHERE bvn_hash = ?`, bvnHash);
    if (existingBvn) throw ApiError.conflict('This BVN is already registered', 'bvn_taken');

    const userId = randomId();
    const passwordHash = await hashPassword(password);
    const now = nowIso();
    await run(
        c.env.DB,
        `INSERT INTO users (id, name, email, phone, password_hash, bvn_hash, bvn_last4,
                            email_verified, is_verified, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'user', 'active', ?, ?)`,
        userId,
        name,
        email,
        phone ?? null,
        passwordHash,
        bvnHash,
        bvnDigits.slice(-4),
        now,
        now,
    );

    const user = (await first(c.env.DB, `SELECT * FROM users WHERE id = ?`, userId)) as UserRow;
    const tokens = await issueTokens(c.env, user);

    // Email verification (token stored hashed; 24h expiry).
    const verifyToken = randomToken(24);
    await run(
        c.env.DB,
        `INSERT INTO email_verifications (id, user_id, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        randomId(),
        userId,
        await sha256Hex(verifyToken),
        Date.now() + EMAIL_VERIFY_TTL_MS,
        Date.now(),
    );
    const verifyUrl = `${c.env.FRONTEND_ORIGIN}/verify-email?token=${verifyToken}`;
    await sendEmail(c.env, {
        to: email,
        userId,
        subject: 'Verify your email — Akawo',
        body:
            `Hi ${name},\n\n` +
            `Welcome to Akawo. Please verify your email by opening this link (valid for 24 hours):\n` +
            `${verifyUrl}\n\n` +
            `If you did not create an account, you can safely ignore this email.\n\n— The Akawo Team`,
    });

    await audit(c.env, userId, 'user.registered', 'user', userId, {
        bvnLast4: bvnDigits.slice(-4),
    });

    c.header('Cache-Control', 'no-store');
    return c.json(
        {
            success: true,
            data: {
                user: publicUser(user),
                tokens,
                emailVerification: {
                    sent: true,
                    // Surfaced in dev so the flow can be completed end-to-end
                    // without a real mailbox. Disabled in production.
                    devUrl: c.env.EXPOSE_RESET_LINKS === 'true' ? verifyUrl : undefined,
                },
            },
        },
        201,
    );
});

/* ---------------------------------- login --------------------------------- */

app.post('/login', async (c) => {
    const ip = clientIp(c);
    const rl = await rateLimit(c.env.CACHE, `login:${ip}`, 10, 15 * 60);
    if (!rl.ok) throw ApiError.tooMany('Too many login attempts, please try again in 15 minutes');

    const body = await c.req.json().catch(() => null);
    const email = body && typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!isEmail(email) || !password) throw ApiError.badRequest('Email and password are required');

    const user = (await first(c.env.DB, `SELECT * FROM users WHERE email = ?`, email)) as
        | UserRow
        | null;

    // Constant-shape failure: hash-check a dummy so timing doesn't reveal existence.
    const dummyHash =
        'pbkdf2-sha256$210000$00112233445566778899$' + 'ab'.repeat(32);
    if (!user || !(await verifyPassword(password, user?.password_hash ?? dummyHash))) {
        throw new ApiError(401, INVALID_CREDENTIALS, 'invalid_credentials');
    }
    if (user.status !== 'active') throw ApiError.forbidden('This account has been suspended');

    await run(c.env.DB, `UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?`, nowIso(), nowIso(), user.id);
    const fresh = (await first(c.env.DB, `SELECT * FROM users WHERE id = ?`, user.id)) as UserRow;
    const tokens = await issueTokens(c.env, fresh);
    await audit(c.env, fresh.id, 'user.login', 'user', fresh.id);

    c.header('Cache-Control', 'no-store');
    return c.json({ success: true, data: { user: publicUser(fresh), tokens } });
});

/* ---------------------------------- logout -------------------------------- */

app.post('/logout', requireUser, async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const token = typeof body?.refreshToken === 'string' ? body.refreshToken : undefined;
    if (token) {
        await revokeRefreshToken(c.env, token);
    }
    await audit(c.env, userOf(c).id, 'user.logout', 'user', userOf(c).id);
    return c.json({ success: true, data: { loggedOut: true } });
});

/**
 * Development / test only — create the first admin account.
 *
 * Enabled only when LOCAL_DEV=true (local dev via .dev.vars and the test
 * pool). It returns 404 in production, where admin creation happens through
 * the documented `scripts/seed.mjs` + `wrangler d1 execute` flow instead.
 */
app.post('/bootstrap-admin', async (c) => {
    if (c.env.LOCAL_DEV !== 'true') throw ApiError.notFound();

    const ip = clientIp(c);
    const rl = await rateLimit(c.env.CACHE, `bootstrap:${ip}`, 5, 3600);
    if (!rl.ok) throw ApiError.tooMany('Too many attempts, please try again later');

    const body = await c.req.json().catch(() => null);
    const name = body && typeof body.name === 'string' ? body.name.trim() : '';
    const email = body && typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const bvn = typeof body?.bvn === 'string' ? body.bvn : '';

    if (!isName(name) || !isEmail(email) || !isStrongPassword(password) || !isBVN(bvn)) {
        throw new ApiError(422, 'name, email, password and an 11-digit BVN are required', 'validation');
    }

    const existing = await first(c.env.DB, `SELECT COUNT(*) AS n FROM users WHERE role = 'admin'`);
    if ((existing as { n: number } | null)?.n) {
        throw ApiError.conflict('An admin already exists', 'admin_exists');
    }

    const bvnHash = await hashBVN(bvn.replace(/\s+/g, ''), c.env.JWT_ACCESS_SECRET);
    const userId = randomId();
    const now = nowIso();
    await run(
        c.env.DB,
        `INSERT INTO users (id, name, email, password_hash, bvn_hash, bvn_last4, email_verified, is_verified, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, 'admin', 'active', ?, ?)`,
        userId,
        name,
        email,
        await hashPassword(password),
        bvnHash,
        bvn.replace(/\s+/g, '').slice(-4),
        now,
        now,
    );
    await audit(c.env, userId, 'admin.bootstrap', 'user', userId);
    return c.json({ success: true, data: { message: 'Admin account created' } }, 201);
});

/* --------------------------------- refresh -------------------------------- */

app.post('/refresh', async (c) => {
    const ip = clientIp(c);
    const rl = await rateLimit(c.env.CACHE, `refresh:${ip}`, 60, 60);
    if (!rl.ok) throw ApiError.tooMany('Too many requests');

    const body = await c.req.json().catch(() => null);
    const token = body && typeof body.refreshToken === 'string' ? body.refreshToken : '';
    if (!token) throw ApiError.badRequest('refreshToken is required');

    const { user, tokens } = await rotateRefreshToken(c.env, token);
    c.header('Cache-Control', 'no-store');
    return c.json({ success: true, data: { user: publicUser(user), tokens } });
});

/* ------------------------------------ me ---------------------------------- */

app.get('/me', requireUser, async (c) => {
    const user = userOf(c);
    return c.json({ success: true, data: { user: publicUser(user) } });
});

/* ------------------------------ email verify ------------------------------ */

app.post('/verify-email', async (c) => {
    const body = await c.req.json().catch(() => null);
    const token = body && typeof body.token === 'string' ? body.token : '';
    if (!token) throw ApiError.badRequest('token is required');

    const hash = await sha256Hex(token);
    const row = (await first(
        c.env.DB,
        `SELECT * FROM email_verifications WHERE token_hash = ? AND used_at IS NULL`,
        hash,
    )) as
        | { id: string; user_id: string; expires_at: number }
        | null;
    if (!row || row.expires_at < Date.now()) {
        throw new ApiError(400, 'This verification link is invalid or has expired', 'invalid_token');
    }

    await tx(c.env.DB, [
        { sql: `UPDATE email_verifications SET used_at = ? WHERE id = ?`, params: [Date.now(), row.id] },
        { sql: `UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?`, params: [nowIso(), row.user_id] },
    ]);

    const user = (await first(c.env.DB, `SELECT * FROM users WHERE id = ?`, row.user_id)) as UserRow;
    await notify(c.env, user.id, 'email_verified', 'Email verified', 'Your email address has been verified.');

    return c.json({ success: true, data: { verified: true } });
});

/* ----------------------------- forgot password ---------------------------- */

app.post('/forgot-password', async (c) => {
    const ip = clientIp(c);
    const body = await c.req.json().catch(() => null);
    const email = body && typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!isEmail(email)) throw ApiError.badRequest('Email is required');

    const rl = await rateLimit(c.env.CACHE, `forgot:${ip}:${email}`, 3, 3600);
    if (!rl.ok) throw ApiError.tooMany('Too many password reset requests, please try again later');

    // Generic response regardless of account existence (anti-enumeration).
    const generic = 'If an account exists for that email, a reset link has been sent';
    const user = (await first(c.env.DB, `SELECT * FROM users WHERE email = ?`, email)) as
        | UserRow
        | null;

    let devResetUrl: string | undefined;
    if (user) {
        const token = randomToken(24);
        await run(
            c.env.DB,
            `INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            randomId(),
            user.id,
            await sha256Hex(token),
            Date.now() + PASSWORD_RESET_TTL_MS,
            Date.now(),
        );
        const resetUrl = `${c.env.FRONTEND_ORIGIN}/reset-password?token=${token}`;
        devResetUrl = resetUrl;
        await sendEmail(c.env, {
            to: user.email,
            userId: user.id,
            subject: 'Reset your password — Akawo',
            body:
                `Hi ${user.name},\n\n` +
                `We received a request to reset your password. Open this link within 1 hour:\n` +
                `${resetUrl}\n\n` +
                `If you did not request this, ignore this email — your password has not changed.\n\n— The Akawo Team`,
        });
        await audit(c.env, user.id, 'user.password_reset_requested', 'user', user.id);
    }

    const data: Record<string, unknown> = { message: generic };
    if (devResetUrl && c.env.EXPOSE_RESET_LINKS === 'true') data.devResetUrl = devResetUrl;
    return c.json({ success: true, data });
});

/* ----------------------------- reset password ----------------------------- */

app.post('/reset-password', async (c) => {
    const ip = clientIp(c);
    const rl = await rateLimit(c.env.CACHE, `reset:${ip}`, 5, 3600);
    if (!rl.ok) throw ApiError.tooMany('Too many attempts, please try again later');

    const body = await c.req.json().catch(() => null);
    const token = body && typeof body.token === 'string' ? body.token : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!token) throw ApiError.badRequest('token is required');
    if (!isStrongPassword(password))
        throw new ApiError(422, 'Password must be at least 8 characters and include a letter and a number', 'validation');

    const hash = await sha256Hex(token);
    const row = (await first(
        c.env.DB,
        `SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL`,
        hash,
    )) as
        | { id: string; user_id: string; expires_at: number }
        | null;
    if (!row || row.expires_at < Date.now()) {
        throw new ApiError(400, 'This reset link is invalid or has expired', 'invalid_token');
    }

    const newPasswordHash = await hashPassword(password);
    await tx(c.env.DB, [
        { sql: `UPDATE password_resets SET used_at = ? WHERE id = ?`, params: [Date.now(), row.id] },
        { sql: `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, params: [newPasswordHash, nowIso(), row.user_id] },
        { sql: `UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`, params: [Date.now(), row.user_id] },
    ]);

    const user = (await first(c.env.DB, `SELECT * FROM users WHERE id = ?`, row.user_id)) as UserRow;
    await audit(c.env, user.id, 'user.password_reset', 'user', user.id);

    return c.json({ success: true, data: { message: 'Password updated. You can now sign in.' } });
});

export default app;
