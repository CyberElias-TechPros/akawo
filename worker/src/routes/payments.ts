import { Hono } from 'hono';
import type { AppEnv } from '../types';
import type { Env } from '../env';
import { first, all, run, tx } from '../db';
import { randomId } from '../util/crypto';
import { secretEquals } from '../util/crypto';
import { ApiError } from '../util/http';
import { formatNgn, nowIso } from '../util/format';
import {  requireUser,
    userOf, } from '../auth';
import { audit, notify } from '../services/notify';
import { sendEmail } from '../services/mail';
import { charge, gatewayMode, initiate as gatewayInitiate, verify as gatewayVerify } from '../services/gateway';

const app = new Hono<AppEnv>();
const money = (kobo: number) => kobo / 100;

interface PaymentRow {
    id: string;
    contribution_id: string;
    user_id: string;
    amount_kobo: number;
    currency: string;
    gateway: string;
    gateway_reference: string | null;
    status: string;
    proof_key: string | null;
    proof_status: string | null;
    proof_note: string | null;
    failure_reason: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
    label?: string | null;
}

const serialize = (p: PaymentRow, includeLabel = false) => ({
    id: p.id,
    contributionId: p.contribution_id,
    amount: money(p.amount_kobo),
    currency: p.currency,
    gateway: p.gateway,
    gatewayReference: p.gateway_reference,
    status: p.status,
    proofStatus: p.proof_status,
    proofNote: p.proof_note,
    failureReason: p.failure_reason,
    completedAt: p.completed_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    ...(includeLabel ? { label: p.label } : {}),
});

async function ownedPayment(db: Env['DB'], id: string, userId: string): Promise<PaymentRow> {
    const row = (await first<PaymentRow>(db, `SELECT * FROM payments WHERE id = ?`, id)) ?? null;
    if (!row) throw ApiError.notFound('Payment not found');
    if (row.user_id !== userId) throw ApiError.forbidden();
    return row;
}

/**
 * Complete a payment AND its contribution atomically.
 * Idempotent: if the contribution is already paid, does nothing (protects
 * against double settlement via polling/webhook/race).
 */
async function settlePayment(db: Env['DB'], env: Env, payment: PaymentRow, gatewayReference: string) {
    const now = nowIso();

    // Monthly contributions roll into the next month's installment the moment
    // this one settles (created inside the same transaction).
    const contribRow = (await first<{ frequency: string; due_date: string | null; label: string | null }>(
        db,
        `SELECT frequency, due_date, label FROM contributions WHERE id = ?`,
        payment.contribution_id,
    )) as { frequency: string; due_date: string | null; label: string | null } | null;

    const statements: Array<{ sql: string; params: unknown[] }> = [
        {
            sql: `UPDATE payments SET status = 'completed', gateway_reference = ?, completed_at = ?, failure_reason = NULL, updated_at = ? WHERE id = ? AND status = 'pending'`,
            params: [gatewayReference, now, now, payment.id],
        },
        {
            sql: `UPDATE contributions SET status = 'paid', paid_at = ?, updated_at = ? WHERE id = ? AND status = 'pending'`,
            params: [now, now, payment.contribution_id],
        },
    ];
    let nextDue: string | null = null;
    if (contribRow?.frequency === 'monthly') {
        const today = now.slice(0, 10);
        const base = contribRow.due_date
            ? new Date(contribRow.due_date + 'T00:00:00Z')
            : new Date(Date.now() - 30 * 86400000);
        base.setUTCMonth(base.getUTCMonth() + 1);
        nextDue = base.toISOString().slice(0, 10);
        if (nextDue < today) nextDue = today;
        statements.push({
            sql: `INSERT INTO contributions (id, user_id, amount_kobo, label, frequency, status, due_date, created_at, updated_at)
                  VALUES (?, ?, ?, ?, 'monthly', 'pending', ?, ?, ?)`,
            params: [randomId(), payment.user_id, payment.amount_kobo, contribRow.label, nextDue, now, now],
        });
    }
    await tx(db, statements);
    await audit(env, payment.user_id, 'payment.completed', 'payment', payment.id, {
        amount: money(payment.amount_kobo),
        gateway: payment.gateway,
        reference: gatewayReference,
    });
    const contrib = await first<{ label: string | null }>(db, `SELECT label FROM contributions WHERE id = ?`, payment.contribution_id);
    const receipt =
        `Payment successful\n\n` +
        `Amount:        ${formatNgn(payment.amount_kobo)}\n` +
        `Reference:     ${gatewayReference}\n` +
        `Date:          ${now}\n` +
        (contrib?.label ? `For:           ${contrib.label}\n` : '') +
        `\nThank you for contributing with Akawo.`;
    if (nextDue) {
        await notify(
            env,
            payment.user_id,
            'installment_scheduled',
            'Next installment scheduled',
            `Your monthly contribution has a new installment due ${nextDue}.`,
        );
        await audit(env, payment.user_id, 'contribution.installment_scheduled', 'contribution', payment.contribution_id, {
            dueDate: nextDue,
        });
    }
    const user = await first<{ name: string; email: string }>(db, `SELECT name, email FROM users WHERE id = ?`, payment.user_id);
    if (user) {
        await notify(env, payment.user_id, 'payment_completed', 'Payment successful', `${formatNgn(payment.amount_kobo)} contributed. Reference ${gatewayReference}.`);
        await sendEmail(env, {
            to: user.email,
            userId: payment.user_id,
            subject: `Your contribution of ${formatNgn(payment.amount_kobo)} was successful — Akawo`,
            body: receipt,
        });
    }
}

/* --------------------------------- list --------------------------------- */

app.get('/', requireUser, async (c) => {
    const user = userOf(c);
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));

    const [totalRow, rows] = await Promise.all([
        first<{ n: number }>(c.env.DB, `SELECT COUNT(*) AS n FROM payments WHERE user_id = ?`, user.id),
        all<PaymentRow>(
            c.env.DB,
            `SELECT p.*, c.label FROM payments p JOIN contributions c ON c.id = p.contribution_id
             WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            user.id,
            limit,
            (page - 1) * limit,
        ),
    ]);
    const total = totalRow?.n ?? 0;
    return c.json({
        success: true,
        data: {
            payments: rows.map((p) => serialize(p, true)),
            pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
        },
    });
});

/* -------------------------------- initiate -------------------------------- */

app.post('/initiate', requireUser, async (c) => {
    const user = userOf(c);
    const body = await c.req.json().catch(() => null);
    const contributionId = body && typeof body.contributionId === 'string' ? body.contributionId : '';
    if (!contributionId) throw ApiError.badRequest('contributionId is required');

    const contrib = (await first(
        c.env.DB,
        `SELECT * FROM contributions WHERE id = ?`,
        contributionId,
    )) as
        | { id: string; user_id: string; amount_kobo: number; status: string; label: string | null }
        | null;
    if (!contrib) throw ApiError.notFound('Contribution not found');
    if (contrib.user_id !== user.id) throw ApiError.forbidden();
    if (contrib.status !== 'pending') {
        throw ApiError.conflict(
            contrib.status === 'paid'
                ? 'This contribution has already been paid'
                : 'This contribution is no longer payable',
            'not_payable',
        );
    }

    const inFlight = (await first<{ n: number }>(
        c.env.DB,
        `SELECT COUNT(*) AS n FROM payments
         WHERE contribution_id = ? AND status IN ('pending','pending_verification')`,
        contrib.id,
    )) as { n: number } | null;
    if (inFlight?.n) {
        throw ApiError.conflict('A payment for this contribution is already in progress', 'payment_in_flight');
    }

    const id = randomId();
    const mode = gatewayMode(c.env);
    const gw = await gatewayInitiate(c.env, {
        reference: id,
        amountKobo: contrib.amount_kobo,
        email: user.email,
        currency: c.env.PAYSTACK_CURRENCY || 'NGN',
    }).catch((err) => {
        console.error(`[payments] gateway init failed: ${(err as Error).message}`);
        throw new ApiError(502, 'Payment gateway is unavailable right now, please try again', 'gateway_unavailable');
    });

    await run(
        c.env.DB,
        `INSERT INTO payments (id, contribution_id, user_id, amount_kobo, currency, gateway,
                               gateway_reference, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        id,
        contrib.id,
        user.id,
        contrib.amount_kobo,
        c.env.PAYSTACK_CURRENCY || 'NGN',
        mode,
        gw.gatewayReference,
        nowIso(),
        nowIso(),
    );
    await audit(c.env, user.id, 'payment.initiated', 'payment', id, {
        amount: money(contrib.amount_kobo),
        gateway: mode,
    });

    const payment = (await first<PaymentRow>(c.env.DB, `SELECT * FROM payments WHERE id = ?`, id))!;
    c.header('Cache-Control', 'no-store');
    return c.json(
        {
            success: true,
            data: {
                payment: serialize(payment),
                gateway: {
                    mode,
                    checkoutUrl: gw.checkoutUrl,
                    currency: c.env.PAYSTACK_CURRENCY || 'NGN',
                },
            },
        },
        201,
    );
});

/* --------------------------------- single --------------------------------- */

app.get('/:id', requireUser, async (c) => {
    const row = await ownedPayment(c.env.DB, c.req.param('id'), userOf(c).id);
    return c.json({ success: true, data: { payment: serialize(row) } });
});

/* ------------------------------ mock charge ------------------------------ */

app.post('/:id/charge', requireUser, async (c) => {
    const user = userOf(c);
    const row = await ownedPayment(c.env.DB, c.req.param('id'), user.id);
    if (row.status !== 'pending') {
        throw ApiError.conflict(
            row.status === 'completed' ? 'This payment is already completed' : 'This payment cannot be charged',
            'not_pending',
        );
    }
    const body = await c.req.json().catch(() => null);
    const card = {
        cardNumber: body && typeof body.cardNumber === 'string' ? body.cardNumber : '',
        expiry: body && typeof body.expiry === 'string' ? body.expiry : '',
        cvv: body && typeof body.cvv === 'string' ? body.cvv : '',
        name: body && typeof body.name === 'string' ? body.name : '',
    };

    const result = await charge(c.env, card);
    const now = nowIso();

    if (!result.success) {
        await run(
            c.env.DB,
            `UPDATE payments SET status = 'failed', failure_reason = ?, updated_at = ? WHERE id = ?`,
            result.declineReason ?? 'Payment declined',
            now,
            row.id,
        );
        await audit(c.env, user.id, 'payment.failed', 'payment', row.id, {
            reason: result.declineReason,
        });
        return c.json({
            success: true,
            data: {
                payment: { status: 'failed', failureReason: result.declineReason ?? 'Payment declined' },
                declined: true,
            },
        });
    }

    await settlePayment(c.env.DB, c.env, row, result.gatewayReference);
    const fresh = (await first<PaymentRow>(c.env.DB, `SELECT * FROM payments WHERE id = ?`, row.id))!;
    return c.json({ success: true, data: { payment: serialize(fresh), declined: false } });
});

/* --------------------------------- verify --------------------------------- */

app.post('/:id/verify', requireUser, async (c) => {
    const user = userOf(c);
    const row = await ownedPayment(c.env.DB, c.req.param('id'), user.id);
    if (row.status === 'completed') {
        return c.json({ success: true, data: { payment: serialize(row), verified: true } });
    }
    if (row.status !== 'pending' || !row.gateway_reference) {
        throw ApiError.conflict('This payment is not awaiting verification', 'not_verifiable');
    }

    const result = await gatewayVerify(c.env, row.gateway_reference).catch(() => ({
        status: 'pending' as const,
        gatewayReference: row.gateway_reference,
    }));

    if (result.status === 'success') {
        await settlePayment(c.env.DB, c.env, row, result.gatewayReference);
        const fresh = (await first<PaymentRow>(c.env.DB, `SELECT * FROM payments WHERE id = ?`, row.id))!;
        return c.json({ success: true, data: { payment: serialize(fresh), verified: true } });
    }
    if (result.status === 'failed') {
        await run(
            c.env.DB,
            `UPDATE payments SET status = 'failed', failure_reason = 'Gateway reported failure', updated_at = ? WHERE id = ?`,
            nowIso(),
            row.id,
        );
        return c.json({ success: true, data: { payment: { status: 'failed' }, verified: false } });
    }
    return c.json({ success: true, data: { payment: serialize(row), verified: false } });
});

/* ------------------------------ proof upload ------------------------------ */

const PROOF_MAX_BYTES = 8 * 1024 * 1024; // 8MB
const PROOF_TYPES: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'application/pdf': 'pdf',
};

app.post('/:id/proof', requireUser, async (c) => {
    const user = userOf(c);
    const row = await ownedPayment(c.env.DB, c.req.param('id'), user.id);
    if (row.status === 'completed') throw ApiError.conflict('This payment is already completed', 'not_pending');
    if (row.status === 'failed' && !row.proof_key) {
        // Allow proof upload as a recovery path for a failed card payment.
    }
    if (row.proof_status === 'approved') throw ApiError.conflict('Proof already approved', 'not_pending');

    const contentType = c.req.header('Content-Type') || '';
    if (!contentType.startsWith('multipart/form-data')) {
        throw ApiError.badRequest('Upload must be multipart/form-data with a single file field');
    }
    const form = await c.req.formData().catch(() => null);
    const file = form ? form.get('file') : null;
    if (!file || typeof file === 'string') throw ApiError.badRequest('A file is required (field name: file)');
    const blob = file as Blob;
    if (blob.size > PROOF_MAX_BYTES) throw new ApiError(413, 'File must be 8MB or smaller');
    const ext = PROOF_TYPES[blob.type];
    if (!ext) {
        throw new ApiError(415, 'Unsupported file type. Upload a JPG, PNG, WEBP, HEIC or PDF');
    }

    const key = `proofs/${user.id}/${row.id}/${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    await c.env.BUCKET.put(key, bytes, {
        httpMetadata: { contentType: blob.type },
        customMetadata: { owner: user.id, payment: row.id },
    });

    const now = nowIso();
    await run(
        c.env.DB,
        `UPDATE payments SET proof_key = ?, proof_status = 'unreviewed', proof_note = NULL,
                             status = 'pending_verification', updated_at = ? WHERE id = ?`,
        key,
        now,
        row.id,
    );
    await audit(c.env, user.id, 'payment.proof_uploaded', 'payment', row.id, { key });

    const fresh = (await first<PaymentRow>(c.env.DB, `SELECT * FROM payments WHERE id = ?`, row.id))!;
    return c.json({ success: true, data: { payment: serialize(fresh) } });
});

/* ------------------------------- webhooks ------------------------------- */

/**
 * Paystack webhook. Verified via a shared secret header
 * (Authorization: Bearer <PAYSTACK_WEBHOOK_SECRET>).
 */
app.post('/webhooks/paystack', async (c) => {
    if (!c.env.PAYSTACK_WEBHOOK_SECRET) {
        throw ApiError.forbidden('Webhooks are not configured');
    }
    const header = c.req.header('Authorization') || '';
    const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!(await secretEquals(provided, c.env.PAYSTACK_WEBHOOK_SECRET))) {
        throw ApiError.unauthorized('Invalid webhook signature');
    }

    const body = await c.req.json().catch(() => null);
    const event = body && typeof body.event === 'string' ? body.event : '';
    const reference =
        body?.data?.reference !== undefined ? String(body.data.reference) : undefined;
    const gatewayRef =
        body?.data?.gateway_reference !== undefined ? String(body.data.gateway_reference) : undefined;

    if (!reference || !gatewayRef) throw ApiError.badRequest('reference and gateway_reference required');

    const payment = (await first<PaymentRow>(
        c.env.DB,
        `SELECT * FROM payments WHERE gateway_reference = ?`,
        reference,
    )) ?? null;
    if (!payment) {
        // Unknown reference: acknowledge (Paystack retries) but do not fail.
        return c.json({ success: true, data: { ignored: true } });
    }
    if (payment.status === 'pending') {
        const succeeded = event === 'charge.success';
        if (succeeded) {
            await settlePayment(c.env.DB, c.env, payment, gatewayRef);
        } else if (event === 'charge.failure') {
            await run(
                c.env.DB,
                `UPDATE payments SET status = 'failed', failure_reason = 'Gateway reported failure', updated_at = ? WHERE id = ?`,
                nowIso(),
                payment.id,
            );
        }
    }
    return c.json({ success: true, data: { processed: true } });
});

export default app;
