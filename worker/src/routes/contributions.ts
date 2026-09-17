import { Hono } from 'hono';
import type { AppEnv } from '../types';
import type { Env } from '../env';
import { first, all, run } from '../db';
import {
    isFrequency,
    isFutureIsoDate,
    isLabel,
    isValidAmount,
    toKobo,
} from '../util/validate';
import { randomId } from '../util/crypto';
import { ApiError } from '../util/http';
import { nowIso, daysFromNowISO } from '../util/format';
import { audit } from '../services/notify';
import { requireUser, userOf } from '../auth';

const app = new Hono<AppEnv>();
const money = (kobo: number) => kobo / 100;

interface ContributionRow {
    id: string;
    user_id: string;
    amount_kobo: number;
    label: string | null;
    frequency: string;
    status: string;
    due_date: string | null;
    paid_at: string | null;
    created_at: string;
    updated_at: string;
}

const serialize = (r: ContributionRow) => ({
    id: r.id,
    amount: money(r.amount_kobo),
    label: r.label,
    frequency: r.frequency,
    status: r.status,
    dueDate: r.due_date,
    paidAt: r.paid_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    overdue:
        r.status === 'pending' && r.due_date !== null && r.due_date < new Date().toISOString().slice(0, 10),
});

async function ownedContribution(db: Env['DB'], id: string, userId: string): Promise<ContributionRow> {
    const row = (await first<ContributionRow>(db, `SELECT * FROM contributions WHERE id = ?`, id)) ?? null;
    if (!row) throw ApiError.notFound('Contribution not found');
    if (row.user_id !== userId) throw ApiError.forbidden();
    return row;
}

/* ---------------------------------- list ---------------------------------- */

app.get('/', requireUser, async (c) => {
    const user = userOf(c);
    const status = c.req.query('status');
    const label = (c.req.query('label') || '').trim();
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));

    const clauses: string[] = ['user_id = ?'];
    const params: unknown[] = [user.id];
    if (status && ['pending', 'paid', 'failed', 'cancelled'].includes(status)) {
        clauses.push('status = ?');
        params.push(status);
    }
    if (label) {
        clauses.push('label LIKE ?');
        params.push(`%${label}%`);
    }
    const where = `WHERE ${clauses.join(' AND ')}`;

    const [totalRow, rows] = await Promise.all([
        first<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n FROM contributions ${where}`, ...params),
        all<ContributionRow>(
            c.env.DB,
            `SELECT * FROM contributions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            ...params,
            limit,
            (page - 1) * limit,
        ),
    ]);

    const total = totalRow?.n ?? 0;
    return c.json({
        success: true,
        data: {
            contributions: rows.map(serialize),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        },
    });
});

/* --------------------------------- create --------------------------------- */

app.post('/', requireUser, async (c) => {
    const user = userOf(c);
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') throw ApiError.badRequest('Invalid request body');

    const errors: string[] = [];
    const amount = typeof body.amount === 'string' ? Number(body.amount) : body.amount;
    const label = body.label !== undefined ? String(body.label) : undefined;
    const frequency = body.frequency === undefined ? 'once' : body.frequency;
    const dueDate = body.dueDate === undefined ? daysFromNowISO(0) : body.dueDate;

    if (!isValidAmount(amount)) errors.push('Amount must be between ₦1.00 and ₦10,000,000.00');
    if (label !== undefined && !isLabel(label)) errors.push('Label must be 120 characters or fewer');
    if (!isFrequency(frequency)) errors.push("Frequency must be 'once' or 'monthly'");
    if (!isFutureIsoDate(dueDate)) errors.push('Due date must be a valid date (today or later)');
    if (errors.length) throw new ApiError(422, errors.join(' '), 'validation');

    const id = randomId();
    const now = nowIso();
    await run(
        c.env.DB,
        `INSERT INTO contributions (id, user_id, amount_kobo, label, frequency, status, due_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        id,
        user.id,
        toKobo(amount),
        label ?? null,
        frequency,
        dueDate,
        now,
        now,
    );
    await audit(c.env, user.id, 'contribution.created', 'contribution', id, { amount });
    const row = (await first<ContributionRow>(c.env.DB, `SELECT * FROM contributions WHERE id = ?`, id))!;
    return c.json({ success: true, data: { contribution: serialize(row) } }, 201);
});

/* --------------------------------- single --------------------------------- */

app.get('/:id', requireUser, async (c) => {
    const row = await ownedContribution(c.env.DB, c.req.param('id'), userOf(c).id);
    return c.json({ success: true, data: { contribution: serialize(row) } });
});

/* --------------------------------- update --------------------------------- */

app.put('/:id', requireUser, async (c) => {
    const user = userOf(c);
    const row = await ownedContribution(c.env.DB, c.req.param('id'), user.id);
    if (row.status !== 'pending' && row.status !== 'failed') {
        throw ApiError.conflict('Only pending or failed contributions can be edited', 'locked');
    }

    const body = await c.req.json().catch(() => null);
    if (!body || typeof body !== 'object') throw ApiError.badRequest('Invalid request body');

    const errors: string[] = [];
    const label = body.label !== undefined ? (body.label === '' ? null : String(body.label)) : row.label;
    const frequency = body.frequency !== undefined ? body.frequency : row.frequency;
    const dueDate = body.dueDate !== undefined ? body.dueDate : row.due_date;
    if (label !== null && !isLabel(label)) errors.push('Label must be 120 characters or fewer');
    if (!isFrequency(frequency)) errors.push("Frequency must be 'once' or 'monthly'");
    if (dueDate !== null && !isFutureIsoDate(dueDate)) errors.push('Due date must be a valid date (today or later)');
    if (errors.length) throw new ApiError(422, errors.join(' '), 'validation');

    await run(
        c.env.DB,
        `UPDATE contributions SET label = ?, frequency = ?, due_date = ?, updated_at = ? WHERE id = ?`,
        label,
        frequency,
        dueDate,
        nowIso(),
        row.id,
    );
    await audit(c.env, user.id, 'contribution.updated', 'contribution', row.id);
    const fresh = (await first<ContributionRow>(c.env.DB, `SELECT * FROM contributions WHERE id = ?`, row.id))!;
    return c.json({ success: true, data: { contribution: serialize(fresh) } });
});

/* --------------------------------- delete --------------------------------- */

app.delete('/:id', requireUser, async (c) => {
    const user = userOf(c);
    const row = await ownedContribution(c.env.DB, c.req.param('id'), user.id);
    if (row.status !== 'pending' && row.status !== 'failed') {
        throw ApiError.conflict('Only pending or failed contributions can be deleted', 'locked');
    }
    const inFlight = (await first<{ n: number }>(
        c.env.DB,
        `SELECT COUNT(*) AS n FROM payments
         WHERE contribution_id = ? AND status IN ('pending','pending_verification')`,
        row.id,
    )) as { n: number } | null;
    if (inFlight?.n) {
        throw ApiError.conflict(
            'A payment for this contribution is in progress — complete it or wait for the review before deleting',
            'payment_in_flight',
        );
    }
    await run(c.env.DB, `DELETE FROM contributions WHERE id = ?`, row.id);
    await audit(c.env, user.id, 'contribution.deleted', 'contribution', row.id);
    return c.json({ success: true, data: { deleted: true } });
});

export default app;
