import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { first, all, run } from '../db';
import { isName, isPhone } from '../util/validate';
import { isStrongPassword } from '../util/validate';
import { hashPassword, verifyPassword } from '../util/crypto';
import { ApiError } from '../util/http';
import { nowIso } from '../util/format';
import {  publicUser, requireUser, type UserRow,
    userOf, } from '../auth';
import { revokeAllUserTokens } from '../auth';
import { audit } from '../services/notify';

const app = new Hono<AppEnv>();

const money = (kobo: number | null | undefined) => Number(kobo ?? 0) / 100;

/* -------------------------------- dashboard ------------------------------- */

app.get('/dashboard', requireUser, async (c) => {
    const user = userOf(c);
    const db = c.env.DB;

    const [summary, recentContributions, recentPayments, nextContribution, unread, proofReview] =
        await Promise.all([
            first<{
                total_contributed_kobo: number | null;
                pending_kobo: number | null;
                paid_count: number;
                pending_count: number;
                monthly_kobo: number | null;
            }>(
                db,
                `SELECT
                    (SELECT COALESCE(SUM(p.amount_kobo),0) FROM payments p WHERE p.user_id = ? AND p.status = 'completed') AS total_contributed_kobo,
                    (SELECT COALESCE(SUM(amount_kobo),0) FROM contributions WHERE user_id = ? AND status = 'pending') AS pending_kobo,
                    (SELECT COUNT(*) FROM contributions WHERE user_id = ? AND status = 'paid') AS paid_count,
                    (SELECT COUNT(*) FROM contributions WHERE user_id = ? AND status = 'pending') AS pending_count,
                    (SELECT COALESCE(SUM(amount_kobo),0) FROM contributions WHERE user_id = ? AND frequency = 'monthly' AND status != 'cancelled') AS monthly_kobo`,
                user.id, user.id, user.id, user.id, user.id,
            ),
            all<{
                id: string; amount_kobo: number; label: string | null; frequency: string;
                status: string; due_date: string | null; created_at: string; paid_at: string | null;
            }>(
                db,
                `SELECT * FROM contributions WHERE user_id = ? ORDER BY created_at DESC LIMIT 5`,
                user.id,
            ),
            all<{
                id: string; amount_kobo: number; status: string; gateway: string;
                proof_status: string | null; created_at: string; completed_at: string | null;
                label: string | null;
            }>(
                db,
                `SELECT p.*, c.label FROM payments p
                 JOIN contributions c ON c.id = p.contribution_id
                 WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 5`,
                user.id,
            ),
            first<{ id: string; amount_kobo: number; due_date: string | null; label: string | null }>(
                db,
                `SELECT * FROM contributions WHERE user_id = ? AND status = 'pending'
                 ORDER BY COALESCE(due_date, '9999-12-31') ASC, created_at ASC LIMIT 1`,
                user.id,
            ),
            first<{ n: number }>(
                db,
                `SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL`,
                user.id,
            ),
            first<{ n: number }>(
                db,
                `SELECT COUNT(*) AS n FROM payments WHERE user_id = ? AND proof_status = 'unreviewed'`,
                user.id,
            ),
        ]);

    const overdue = nextContribution?.due_date
        ? nextContribution.due_date < new Date().toISOString().slice(0, 10)
        : false;

    return c.json({
        success: true,
        data: {
            user: publicUser(user),
            summary: {
                totalContributed: money(summary?.total_contributed_kobo),
                pendingAmount: money(summary?.pending_kobo),
                paidCount: summary?.paid_count ?? 0,
                pendingCount: summary?.pending_count ?? 0,
                monthlyTotal: money(summary?.monthly_kobo),
            },
            nextContribution: nextContribution
                ? {
                      id: nextContribution.id,
                      amount: money(nextContribution.amount_kobo),
                      dueDate: nextContribution.due_date,
                      label: nextContribution.label,
                      overdue,
                  }
                : null,
            recentContributions: (recentContributions ?? []).map((r) => ({
                id: r.id,
                amount: money(r.amount_kobo),
                label: r.label,
                frequency: r.frequency,
                status: r.status,
                dueDate: r.due_date,
                createdAt: r.created_at,
                paidAt: r.paid_at,
            })),
            recentPayments: (recentPayments ?? []).map((p) => ({
                id: p.id,
                amount: money(p.amount_kobo),
                status: p.status,
                gateway: p.gateway,
                proofStatus: p.proof_status,
                label: p.label,
                createdAt: p.created_at,
                completedAt: p.completed_at,
            })),
            unreadNotifications: unread?.n ?? 0,
            proofsAwaitingReview: proofReview?.n ?? 0,
            verification: {
                isVerified: !!user.is_verified,
                emailVerified: !!user.email_verified,
            },
        },
    });
});

/* --------------------------------- profile -------------------------------- */

app.put('/profile', requireUser, async (c) => {
    const user = userOf(c);
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') throw ApiError.badRequest('Invalid request body');

    const errors: string[] = [];
    const name = body.name !== undefined ? String(body.name).trim() : user.name;
    const phone = body.phone !== undefined ? (body.phone === '' ? null : String(body.phone).trim()) : user.phone;
    if (!isName(name)) errors.push('Please enter your full name (2–120 characters)');
    if (phone !== null && !isPhone(phone)) errors.push('Please enter a valid phone number');
    if (errors.length) throw new ApiError(422, errors.join(' '), 'validation');

    const now = nowIso();
    await run(c.env.DB, `UPDATE users SET name = ?, phone = ?, updated_at = ? WHERE id = ?`, name, phone, now, user.id);
    await audit(c.env, user.id, 'user.profile_updated', 'user', user.id);

    const fresh = (await first(c.env.DB, `SELECT * FROM users WHERE id = ?`, user.id)) as UserRow;
    return c.json({ success: true, data: { user: publicUser(fresh) } });
});

/* --------------------------------- password ------------------------------- */

app.put('/password', requireUser, async (c) => {
    const user = userOf(c);
    const body = await c.req.json().catch(() => null);
    const current = body && typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const next = body && typeof body.newPassword === 'string' ? body.newPassword : '';
    if (!current) throw ApiError.badRequest('currentPassword is required');
    if (!isStrongPassword(next))
        throw new ApiError(422, 'New password must be at least 8 characters and include a letter and a number', 'validation');

    if (!(await verifyPassword(current, user.password_hash))) {
        throw new ApiError(400, 'Current password is incorrect', 'wrong_password');
    }

    const hash = await hashPassword(next);
    const now = nowIso();
    await run(c.env.DB, `UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, hash, now, user.id);
    await revokeAllUserTokens(c.env, user.id);
    await audit(c.env, user.id, 'user.password_changed', 'user', user.id);

    return c.json({
        success: true,
        data: {
            message: 'Password updated. Please sign in again with your new password.',
            mustReauthenticate: true,
        },
    });
});

export default app;
