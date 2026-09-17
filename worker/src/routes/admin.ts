import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppEnv } from '../types';
import { first, all, run } from '../db';
import { ApiError } from '../util/http';
import { nowIso, maskBVN } from '../util/format';
import { requireUser, requireAdmin, type UserRow } from '../auth';
import { audit, notify } from '../services/notify';
import { sendEmail } from '../services/mail';
import { signedMediaUrl } from '../util/signed';

const app = new Hono<AppEnv>();
app.use('*', requireUser, requireAdmin);

const adminOf = (c: Context<AppEnv>): UserRow => {
    const u = c.get('user');
    if (!u) throw ApiError.unauthorized();
    return u;
};

const money = (kobo: number | null | undefined) => Number(kobo ?? 0) / 100;

/* ---------------------------------- stats --------------------------------- */

app.get('/stats', async (c) => {
    const db = c.env.DB;
    const [usersRow, contribRow, payRow, verifRow, recentPayments, topContributors, monthly] =
        await Promise.all([
            first<{ total: number; verified: number; pending_kyc: number; email_unverified: number }>(
                db,
                `SELECT COUNT(*) AS total,
                        SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) AS verified,
                        SUM(CASE WHEN is_verified = 0 THEN 1 ELSE 0 END) AS pending_kyc,
                        SUM(CASE WHEN email_verified = 0 THEN 1 ELSE 0 END) AS email_unverified
                 FROM users`,
            ),
            first<{ count: number; total_kobo: number | null; pending_kobo: number | null }>(
                db,
                `SELECT COUNT(*) AS count,
                        SUM(amount_kobo) AS total_kobo,
                        SUM(CASE WHEN status = 'pending' THEN amount_kobo ELSE 0 END) AS pending_kobo
                 FROM contributions`,
            ),
            first<{ completed: number; completed_kobo: number | null; pending: number; pending_kobo: number | null; failed: number }>(
                db,
                `SELECT
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
                    SUM(CASE WHEN status = 'completed' THEN amount_kobo ELSE 0 END) AS completed_kobo,
                    SUM(CASE WHEN status IN ('pending','pending_verification') THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN status IN ('pending','pending_verification') THEN amount_kobo ELSE 0 END) AS pending_kobo,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
                 FROM payments`,
            ),
            first<{ pending: number; approved: number; rejected: number }>(
                db,
                `SELECT
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
                 FROM verifications`,
            ),
            all<{ id: string; amount_kobo: number; status: string; created_at: string; name: string; email: string }>(
                db,
                `SELECT p.id, p.amount_kobo, p.status, p.created_at, u.name, u.email
                 FROM payments p JOIN users u ON u.id = p.user_id
                 ORDER BY p.created_at DESC LIMIT 8`,
            ),
            all<{ name: string; total_kobo: number | null }>(
                db,
                `SELECT u.name, SUM(p.amount_kobo) AS total_kobo
                 FROM payments p JOIN users u ON u.id = p.user_id
                 WHERE p.status = 'completed'
                 GROUP BY u.id ORDER BY total_kobo DESC LIMIT 5`,
            ),
            all<{ month: string; kobo: number | null }>(
                db,
                `SELECT strftime('%Y-%m', created_at) AS month, SUM(amount_kobo) AS kobo
                 FROM payments WHERE status = 'completed'
                 GROUP BY month ORDER BY month DESC LIMIT 6`,
            ),
        ]);

    return c.json({
        success: true,
        data: {
            users: {
                total: usersRow?.total ?? 0,
                verified: usersRow?.verified ?? 0,
                pendingKyc: usersRow?.pending_kyc ?? 0,
                emailUnverified: usersRow?.email_unverified ?? 0,
            },
            contributions: {
                count: contribRow?.count ?? 0,
                total: money(contribRow?.total_kobo),
                pending: money(contribRow?.pending_kobo),
            },
            payments: {
                completed: payRow?.completed ?? 0,
                completedTotal: money(payRow?.completed_kobo),
                pending: payRow?.pending ?? 0,
                pendingTotal: money(payRow?.pending_kobo),
                failed: payRow?.failed ?? 0,
            },
            verifications: {
                pending: verifRow?.pending ?? 0,
                approved: verifRow?.approved ?? 0,
                rejected: verifRow?.rejected ?? 0,
            },
            recentPayments: (recentPayments ?? []).map((p) => ({
                id: p.id,
                amount: money(p.amount_kobo),
                status: p.status,
                createdAt: p.created_at,
                user: { name: p.name, email: p.email },
            })),
            topContributors: (topContributors ?? []).map((t) => ({
                name: t.name,
                total: money(t.total_kobo),
            })),
            monthly: (monthly ?? [])
                .map((m) => ({ month: m.month, total: money(m.kobo) }))
                .reverse(),
        },
    });
});

/* ---------------------------------- users --------------------------------- */

const userRow = (u: UserRow) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    bvnLast4: maskBVN(u.bvn_last4),
    emailVerified: !!u.email_verified,
    isVerified: !!u.is_verified,
    role: u.role,
    status: u.status,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
});

app.get('/users', async (c) => {
    const q = (c.req.query('q') || '').trim();
    const role = c.req.query('role');
    const verified = c.req.query('verified');
    const status = c.req.query('status');
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));

    const where: string[] = [];
    const params: unknown[] = [];
    if (q) {
        where.push('(name LIKE ? OR email LIKE ?)');
        const like = `%${q}%`;
        params.push(like, like);
    }
    if (role && ['user', 'admin'].includes(role)) {
        where.push('role = ?');
        params.push(role);
    }
    if (verified === 'true' || verified === 'false') {
        where.push('is_verified = ?');
        params.push(verified === 'true' ? 1 : 0);
    }
    if (status && ['active', 'suspended'].includes(status)) {
        where.push('status = ?');
        params.push(status);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [totalRow, rows] = await Promise.all([
        first<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n FROM users ${whereSql}`, ...params),
        all<UserRow>(
            c.env.DB,
            `SELECT * FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            ...params,
            limit,
            (page - 1) * limit,
        ),
    ]);

    return c.json({
        success: true,
        data: {
            users: rows.map(userRow),
            pagination: {
                page,
                limit,
                total: totalRow?.n ?? 0,
                totalPages: Math.max(1, Math.ceil((totalRow?.n ?? 0) / limit)),
            },
        },
    });
});

app.get('/users/:id', async (c) => {
    const id = c.req.param('id');
    const user = (await first<UserRow>(c.env.DB, `SELECT * FROM users WHERE id = ?`, id)) ?? null;
    if (!user) throw ApiError.notFound('User not found');

    const [contributions, payments, verifications] = await Promise.all([
        all<{ id: string; amount_kobo: number; status: string; label: string | null; created_at: string }>(
            c.env.DB,
            `SELECT * FROM contributions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
            id,
        ),
        all<{ id: string; amount_kobo: number; status: string; proof_status: string | null; created_at: string; completed_at: string | null }>(
            c.env.DB,
            `SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
            id,
        ),
        all<{ id: string; status: string; created_at: string; reviewed_at: string | null }>(
            c.env.DB,
            `SELECT * FROM verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
            id,
        ),
    ]);

    return c.json({
        success: true,
        data: {
            user: userRow(user),
            contributions: contributions.map((x) => ({
                id: x.id,
                amount: money(x.amount_kobo),
                status: x.status,
                label: x.label,
                createdAt: x.created_at,
            })),
            payments: payments.map((p) => ({
                id: p.id,
                amount: money(p.amount_kobo),
                status: p.status,
                proofStatus: p.proof_status,
                createdAt: p.created_at,
                completedAt: p.completed_at,
            })),
            verifications: verifications.map((v) => ({
                id: v.id,
                status: v.status,
                createdAt: v.created_at,
                reviewedAt: v.reviewed_at,
            })),
        },
    });
});

app.put('/users/:id/status', async (c) => {
    const admin = adminOf(c);
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => null);
    const status = body && typeof body.status === 'string' ? body.status : '';
    if (!['active', 'suspended'].includes(status)) throw ApiError.badRequest('status must be active or suspended');
    if (id === admin.id) throw ApiError.conflict('You cannot suspend your own account', 'self_action');

    const user = (await first<UserRow>(c.env.DB, `SELECT * FROM users WHERE id = ?`, id)) ?? null;
    if (!user) throw ApiError.notFound('User not found');

    await run(c.env.DB, `UPDATE users SET status = ?, updated_at = ? WHERE id = ?`, status, nowIso(), id);
    await audit(c.env, admin.id, 'admin.user_status_changed', 'user', id, { status });
    if (status === 'suspended') {
        await run(c.env.DB, `UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL`, Date.now(), id);
        await notify(c.env, id, 'account_suspended', 'Account suspended', 'Your account has been suspended. Contact support if you believe this is an error.');
    }
    const fresh = (await first<UserRow>(c.env.DB, `SELECT * FROM users WHERE id = ?`, id))!;
    return c.json({ success: true, data: { user: userRow(fresh) } });
});

app.put('/users/:id/role', async (c) => {
    const admin = adminOf(c);
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => null);
    const role = body && typeof body.role === 'string' ? body.role : '';
    if (!['user', 'admin'].includes(role)) throw ApiError.badRequest('role must be user or admin');
    if (id === admin.id && role !== 'admin') throw ApiError.conflict('You cannot demote your own account', 'self_action');

    const user = (await first<UserRow>(c.env.DB, `SELECT * FROM users WHERE id = ?`, id)) ?? null;
    if (!user) throw ApiError.notFound('User not found');
    if (user.role === 'admin' && role === 'user') {
        const admins = await first<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n FROM users WHERE role = 'admin'`);
        if ((admins?.n ?? 0) <= 1) throw ApiError.conflict('Cannot remove the last admin', 'last_admin');
    }

    await run(c.env.DB, `UPDATE users SET role = ?, updated_at = ? WHERE id = ?`, role, nowIso(), id);
    await audit(c.env, admin.id, 'admin.user_role_changed', 'user', id, { role });
    const fresh = (await first<UserRow>(c.env.DB, `SELECT * FROM users WHERE id = ?`, id))!;
    return c.json({ success: true, data: { user: userRow(fresh) } });
});

/* ------------------------------ verifications ------------------------------ */

app.get('/verifications', async (c) => {
    const status = c.req.query('status');
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));

    const where = status && ['pending', 'approved', 'rejected'].includes(status)
        ? `WHERE v.status = ?`
        : '';
    const params: unknown[] = status ? [status] : [];

    const [totalRow, rows] = await Promise.all([
        first<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n FROM verifications v ${where}`, ...params),
        all<{
            id: string; user_id: string; status: string; created_at: string; reviewed_at: string | null;
            name: string; email: string; phone: string | null; bvn_last4: string;
        }>(
            c.env.DB,
            `SELECT v.id, v.user_id, v.status, v.created_at, v.reviewed_at, u.name, u.email, u.phone, u.bvn_last4
             FROM verifications v JOIN users u ON u.id = v.user_id ${where}
             ORDER BY v.created_at DESC LIMIT ? OFFSET ?`,
            ...params,
            limit,
            (page - 1) * limit,
        ),
    ]);

    return c.json({
        success: true,
        data: {
            verifications: rows.map((v) => ({
                id: v.id,
                userId: v.user_id,
                status: v.status,
                createdAt: v.created_at,
                reviewedAt: v.reviewed_at,
                user: {
                    name: v.name,
                    email: v.email,
                    phone: v.phone,
                    bvnLast4: maskBVN(v.bvn_last4),
                },
            })),
            pagination: {
                page,
                limit,
                total: totalRow?.n ?? 0,
                totalPages: Math.max(1, Math.ceil((totalRow?.n ?? 0) / limit)),
            },
        },
    });
});

app.get('/verifications/:id', async (c) => {
    const id = c.req.param('id');
    const v = (await first(
        c.env.DB,
        `SELECT v.*, u.name, u.email, u.phone, u.bvn_last4, u.bvn_hash FROM verifications v
         JOIN users u ON u.id = v.user_id WHERE v.id = ?`,
        id,
    )) as
        | {
              id: string;
              user_id: string;
              face_key: string;
              liveness_key: string;
              face_meta: string | null;
              liveness_meta: string | null;
              status: string;
              reject_reason: string | null;
              created_at: string;
              reviewed_at: string | null;
              name: string;
              email: string;
              phone: string | null;
              bvn_last4: string;
          }
        | null;
    if (!v) throw ApiError.notFound('Verification not found');

    const subject = { id: adminOf(c).id, role: 'admin' };
    return c.json({
        success: true,
        data: {
            verification: {
                id: v.id,
                status: v.status,
                createdAt: v.created_at,
                reviewedAt: v.reviewed_at,
                rejectReason: v.reject_reason,
                faceMeta: v.face_meta ? JSON.parse(v.face_meta) : null,
                livenessMeta: v.liveness_meta ? JSON.parse(v.liveness_meta) : null,
                user: {
                    name: v.name,
                    email: v.email,
                    phone: v.phone,
                    bvnLast4: maskBVN(v.bvn_last4),
                },
                media: {
                    face: await signedMediaUrl(c.env, v.face_key, subject),
                    liveness: await signedMediaUrl(c.env, v.liveness_key, subject),
                },
            },
        },
    });
});

app.post('/verifications/:id/approve', async (c) => {
    const admin = adminOf(c);
    const id = c.req.param('id');
    const v = (await first<{ id: string; user_id: string; status: string }>(
        c.env.DB,
        `SELECT id, user_id, status FROM verifications WHERE id = ?`,
        id,
    )) ?? null;
    if (!v) throw ApiError.notFound('Verification not found');
    if (v.status !== 'pending') throw ApiError.conflict('This verification has already been reviewed', 'not_pending');

    const now = nowIso();
    await run(
        c.env.DB,
        `UPDATE verifications SET status = 'approved', reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`,
        admin.id,
        now,
        now,
        id,
    );
    await run(c.env.DB, `UPDATE users SET is_verified = 1, updated_at = ? WHERE id = ?`, now, v.user_id);

    const user = (await first<UserRow>(c.env.DB, `SELECT * FROM users WHERE id = ?`, v.user_id)) ?? null;
    if (user) {
        await notify(c.env, user.id, 'verification_approved', 'Identity verified', 'Congratulations — your identity has been verified. Your account is now fully unlocked.');
        await sendEmail(c.env, {
            to: user.email,
            userId: user.id,
            subject: 'Your identity has been verified — Akawo',
            body: `Hi ${user.name},\n\nGreat news — your identity verification was approved. Your Akawo account is now fully unlocked.\n\n— The Akawo Team`,
        });
    }
    await audit(c.env, admin.id, 'admin.verification_approved', 'verification', id, { userId: v.user_id });
    return c.json({ success: true, data: { approved: true } });
});

app.post('/verifications/:id/reject', async (c) => {
    const admin = adminOf(c);
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => null);
    const reason = body && typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : 'Documents could not be verified';
    if (!reason) throw ApiError.badRequest('A reason is required');

    const v = (await first<{ id: string; user_id: string; status: string }>(
        c.env.DB,
        `SELECT id, user_id, status FROM verifications WHERE id = ?`,
        id,
    )) ?? null;
    if (!v) throw ApiError.notFound('Verification not found');
    if (v.status !== 'pending') throw ApiError.conflict('This verification has already been reviewed', 'not_pending');

    const now = nowIso();
    await run(
        c.env.DB,
        `UPDATE verifications SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, reject_reason = ?, updated_at = ?
         WHERE id = ?`,
        admin.id,
        now,
        reason,
        now,
        id,
    );
    const user = (await first<UserRow>(c.env.DB, `SELECT * FROM users WHERE id = ?`, v.user_id)) ?? null;
    if (user) {
        await notify(c.env, user.id, 'verification_rejected', 'Identity verification update', `Your verification was not approved: ${reason}. You can submit new documents.`);
        await sendEmail(c.env, {
            to: user.email,
            userId: user.id,
            subject: 'Action needed on your identity verification — Akawo',
            body: `Hi ${user.name},\n\nUnfortunately your identity verification was not approved.\nReason: ${reason}\n\nYou can submit new documents from your account at any time.\n\n— The Akawo Team`,
        });
    }
    await audit(c.env, admin.id, 'admin.verification_rejected', 'verification', id, { userId: v.user_id, reason });
    return c.json({ success: true, data: { rejected: true } });
});

/* --------------------------------- payments -------------------------------- */

app.get('/payments', async (c) => {
    const status = c.req.query('status');
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));

    const where = status && ['pending', 'completed', 'failed', 'refunded', 'pending_verification'].includes(status)
        ? `WHERE p.status = ?`
        : '';
    const params: unknown[] = status ? [status] : [];

    const [totalRow, rows] = await Promise.all([
        first<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n FROM payments p ${where}`, ...params),
        all<{
            id: string; amount_kobo: number; status: string; gateway: string;
            proof_status: string | null; created_at: string; completed_at: string | null;
            name: string; email: string; label: string | null;
        }>(
            c.env.DB,
            `SELECT p.id, p.amount_kobo, p.status, p.gateway, p.proof_status, p.created_at, p.completed_at,
                    u.name, u.email, c.label
             FROM payments p
             JOIN users u ON u.id = p.user_id
             JOIN contributions c ON c.id = p.contribution_id
             ${where}
             ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            ...params,
            limit,
            (page - 1) * limit,
        ),
    ]);

    return c.json({
        success: true,
        data: {
            payments: rows.map((p) => ({
                id: p.id,
                amount: money(p.amount_kobo),
                status: p.status,
                gateway: p.gateway,
                proofStatus: p.proof_status,
                label: p.label,
                createdAt: p.created_at,
                completedAt: p.completed_at,
                user: { name: p.name, email: p.email },
            })),
            pagination: {
                page,
                limit,
                total: totalRow?.n ?? 0,
                totalPages: Math.max(1, Math.ceil((totalRow?.n ?? 0) / limit)),
            },
        },
    });
});

async function proofReview(c: Context<AppEnv>, approve: boolean, note?: string) {
    const admin = adminOf(c);
    const id = c.req.param('id');
    const p = (await first(
        c.env.DB,
        `SELECT * FROM payments WHERE id = ?`,
        id,
    )) as
        | {
              id: string;
              user_id: string;
              contribution_id: string;
              amount_kobo: number;
              status: string;
              proof_status: string | null;
              proof_key: string | null;
          }
        | null;
    if (!p) throw ApiError.notFound('Payment not found');
    if (!p.proof_key) throw ApiError.conflict('No proof of payment has been uploaded for this payment', 'no_proof');
    if (p.proof_status === 'approved' || p.status === 'completed') {
        throw ApiError.conflict('This proof has already been approved', 'already_reviewed');
    }

    const now = nowIso();
    if (approve) {
        await run(
            c.env.DB,
            `UPDATE payments SET status = 'completed', proof_status = 'approved', proof_note = ?,
                             completed_at = ?, updated_at = ? WHERE id = ?`,
            note ?? null,
            now,
            now,
            id,
        );
        await run(
            c.env.DB,
            `UPDATE contributions SET status = 'paid', paid_at = ?, updated_at = ? WHERE id = ? AND status = 'pending'`,
            now,
            now,
            p.contribution_id,
        );
        await notify(c.env, p.user_id, 'payment_completed', 'Payment confirmed', `Your payment of ₦${money(p.amount_kobo).toFixed(2)} was confirmed from your proof of payment.`);
        await audit(c.env, admin.id, 'admin.proof_approved', 'payment', id, { note });
    } else {
        await run(
            c.env.DB,
            `UPDATE payments SET proof_status = 'rejected', proof_note = ?, status = 'failed', updated_at = ? WHERE id = ?`,
            note ?? 'Proof could not be verified',
            now,
            id,
        );
        await notify(c.env, p.user_id, 'proof_rejected', 'Payment proof update', `Your proof of payment could not be accepted: ${note ?? 'could not be verified'}. Please try again or contact support.`);
        await audit(c.env, admin.id, 'admin.proof_rejected', 'payment', id, { note });
    }
    return c.json({ success: true, data: { reviewed: true } });
}

app.post('/payments/:id/proof/approve', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const note = body && typeof body.note === 'string' ? body.note.trim().slice(0, 300) : undefined;
    return proofReview(c, true, note);
});

app.post('/payments/:id/proof/reject', async (c) => {
    const body = await c.req.json().catch(() => null);
    const note = body && typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : undefined;
    if (!note) throw ApiError.badRequest('A reason is required');
    return proofReview(c, false, note);
});

/* ---------------------------------- audit ---------------------------------- */

app.get('/audit', async (c) => {
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10) || 50));
    const [totalRow, rows] = await Promise.all([
        first<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n FROM audit_logs`),
        all<{
            id: string; actor_id: string | null; action: string; entity: string | null;
            entity_id: string | null; meta: string | null; created_at: string; name: string | null;
        }>(
            c.env.DB,
            `SELECT a.*, u.name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
             ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
            limit,
            (page - 1) * limit,
        ),
    ]);
    return c.json({
        success: true,
        data: {
            entries: rows.map((r) => ({
                id: r.id,
                actor: r.name ?? (r.actor_id ? 'deleted user' : 'system'),
                action: r.action,
                entity: r.entity,
                entityId: r.entity_id,
                meta: r.meta ? JSON.parse(r.meta) : null,
                createdAt: r.created_at,
            })),
            pagination: {
                page,
                limit,
                total: totalRow?.n ?? 0,
                totalPages: Math.max(1, Math.ceil((totalRow?.n ?? 0) / limit)),
            },
        },
    });
});

/* ---------------------------------- outbox --------------------------------- */

app.get('/emails', async (c) => {
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10) || 50));
    const [totalRow, rows] = await Promise.all([
        first<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n FROM emails`),
        all<{ id: string; to_email: string; subject: string; body: string; sent_at: string }>(
            c.env.DB,
            `SELECT * FROM emails ORDER BY sent_at DESC LIMIT ? OFFSET ?`,
            limit,
            (page - 1) * limit,
        ),
    ]);
    return c.json({
        success: true,
        data: {
            emails: rows.map((e) => ({
                id: e.id,
                to: e.to_email,
                subject: e.subject,
                body: e.body,
                sentAt: e.sent_at,
            })),
            pagination: {
                page,
                limit,
                total: totalRow?.n ?? 0,
                totalPages: Math.max(1, Math.ceil((totalRow?.n ?? 0) / limit)),
            },
        },
    });
});

export default app;
