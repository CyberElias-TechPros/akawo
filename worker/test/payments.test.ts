import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { api, registerUser, bootstrapAdmin, PNG_BYTES, multipart } from './helpers';

const GOOD_CARD = { cardNumber: '5396 0000 0000 0000', expiry: '12/29', cvv: '123', name: 'Ada Obi' };

async function makeContribution(token: string, amount: number) {
    const c = await api('POST', '/api/contributions', { token, body: { amount } });
    expect(c.status).toBe(201);
    return c.body.data.contribution as { id: string; amount: number };
}

async function lastNotification(userToken: string) {
    const res = await api('GET', '/api/notifications?limit=1', { token: userToken });
    return res.body.data.notifications[0] ?? null;
}

async function lastEmail(adminToken: string) {
    const res = await api('GET', '/api/admin/emails?limit=1', { token: adminToken });
    return res.body.data.emails[0] ?? null;
}

describe('payments — full happy path', () => {
    it('initiate → charge → contribution paid, with notification + receipt email', async () => {
        const u = await registerUser();
        const admin = await bootstrapAdmin();
        const contrib = await makeContribution(u.tokens.accessToken, 50000);

        const init = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        expect(init.status).toBe(201);
        const payment = init.body.data.payment;
        expect(payment.status).toBe('pending');
        expect(payment.amount).toBe(50000);
        expect(init.body.data.gateway.mode).toBe('mock');

        const charge = await api('POST', `/api/payments/${payment.id}/charge`, {
            token: u.tokens.accessToken,
            body: GOOD_CARD,
        });
        expect(charge.status).toBe(200);
        expect(charge.body.data.payment.status).toBe('completed');
        expect(charge.body.data.payment.gatewayReference).toMatch(/^MOCK_/);

        // Contribution flipped to paid
        const contribAfter = await api('GET', `/api/contributions/${contrib.id}`, { token: u.tokens.accessToken });
        expect(contribAfter.body.data.contribution.status).toBe('paid');
        expect(contribAfter.body.data.contribution.paidAt).toBeTruthy();

        // In-app notification
        const notif = await lastNotification(u.tokens.accessToken);
        expect(notif?.type).toBe('payment_completed');
        expect(notif?.body).toContain('50,000.00');

        // Email receipt in the outbox
        const email = await lastEmail(admin.token);
        expect(email?.subject).toContain('50,000.00');
        expect(email?.to).toBe(u.email);

        // Dashboard reflects the completed payment
        const dash = await api('GET', '/api/users/dashboard', { token: u.tokens.accessToken });
        expect(dash.body.data.summary.totalContributed).toBe(50000);
        expect(dash.body.data.summary.paidCount).toBe(1);
    });

    it('declines the known failure card and keeps the contribution payable', async () => {
        const u = await registerUser();
        const contrib = await makeContribution(u.tokens.accessToken, 10000);
        const init = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        const payment = init.body.data.payment;

        const charge = await api('POST', `/api/payments/${payment.id}/charge`, {
            token: u.tokens.accessToken,
            body: { ...GOOD_CARD, cardNumber: '5396 0000 0000 0002' },
        });
        expect(charge.body.data.payment.status).toBe('failed');
        expect(charge.body.data.payment.failureReason).toMatch(/insufficient funds/i);

        const contribAfter = await api('GET', `/api/contributions/${contrib.id}`, { token: u.tokens.accessToken });
        expect(contribAfter.body.data.contribution.status).toBe('pending');

        // A fresh attempt with a good card succeeds
        const retry = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        const charge2 = await api('POST', `/api/payments/${retry.body.data.payment.id}/charge`, {
            token: u.tokens.accessToken,
            body: GOOD_CARD,
        });
        expect(charge2.body.data.payment.status).toBe('completed');
    });

    it('rejects bad card data with actionable messages', async () => {
        const u = await registerUser();
        const contrib = await makeContribution(u.tokens.accessToken, 5000);
        const init = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        const id = init.body.data.payment.id;

        const luhn = await api('POST', `/api/payments/${id}/charge`, {
            token: u.tokens.accessToken,
            body: { ...GOOD_CARD, cardNumber: '1234 5678 9012 3456' },
        });
        expect(luhn.body.data.payment.failureReason).toMatch(/card number/i);
        expect(luhn.body.data.payment.status).toBe('failed');

        // Next attempt on the same payment is blocked (it is failed now)
        const again = await api('POST', `/api/payments/${id}/charge`, {
            token: u.tokens.accessToken,
            body: GOOD_CARD,
        });
        expect(again.status).toBe(409);
    });

    it('blocks payment on an already-paid contribution (no double payment)', async () => {
        const u = await registerUser();
        const contrib = await makeContribution(u.tokens.accessToken, 7000);
        const init = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        await api('POST', `/api/payments/${init.body.data.payment.id}/charge`, {
            token: u.tokens.accessToken,
            body: GOOD_CARD,
        });
        const second = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        expect(second.status).toBe(409);
        expect(second.body.error.code).toBe('not_payable');
    });

    it('enforces ownership on initiate and charge (IDOR)', async () => {
        const a = await registerUser();
        const b = await registerUser();
        const contrib = await makeContribution(a.tokens.accessToken, 9000);

        const init = await api('POST', '/api/payments/initiate', {
            token: b.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        expect(init.status).toBe(403);

        const initA = await api('POST', '/api/payments/initiate', {
            token: a.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        const read = await api('GET', `/api/payments/${initA.body.data.payment.id}`, { token: b.tokens.accessToken });
        expect(read.status).toBe(403);
        const charge = await api('POST', `/api/payments/${initA.body.data.payment.id}/charge`, {
            token: b.tokens.accessToken,
            body: GOOD_CARD,
        });
        expect(charge.status).toBe(403);
    });
});

describe('payments — proof of payment flow', () => {
    it('upload proof → admin approves → contribution paid', async () => {
        const u = await registerUser();
        const admin = await bootstrapAdmin();
        const contrib = await makeContribution(u.tokens.accessToken, 12000);
        const init = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        const paymentId = init.body.data.payment.id;

        const fd = multipart({ file: { content: PNG_BYTES, name: 'receipt.png', type: 'image/png' } });
        const upload = await SELF.fetch(
            new Request(`http://localhost/api/payments/${paymentId}/proof`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${u.tokens.accessToken}` },
                body: fd,
            }),
        );
        expect(upload.status).toBe(200);
        const uploaded = (await upload.json()) as any;
        expect(uploaded.data.payment.status).toBe('pending_verification');
        expect(uploaded.data.payment.proofStatus).toBe('unreviewed');

        // Admin sees it in the pending_verification list
        const pending = await api('GET', '/api/admin/payments?status=pending_verification', { token: admin.token });
        expect(pending.body.data.payments.some((p: { id: string }) => p.id === paymentId)).toBe(true);

        // Admin approves
        const approve = await api('POST', `/api/admin/payments/${paymentId}/proof/approve`, {
            token: admin.token,
            body: { note: 'Matches transfer of 12,000.00' },
        });
        expect(approve.status).toBe(200);

        const contribAfter = await api('GET', `/api/contributions/${contrib.id}`, { token: u.tokens.accessToken });
        expect(contribAfter.body.data.contribution.status).toBe('paid');

        const notif = await lastNotification(u.tokens.accessToken);
        expect(notif?.type).toBe('payment_completed');
    });

    it('admin rejection sends the user a reason and lets them retry', async () => {
        const u = await registerUser();
        const admin = await bootstrapAdmin();
        const contrib = await makeContribution(u.tokens.accessToken, 8000);
        const init = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        const paymentId = init.body.data.payment.id;

        const fd = multipart({ file: { content: PNG_BYTES, name: 'blurry.jpg', type: 'image/jpeg' } });
        await SELF.fetch(
            new Request(`http://localhost/api/payments/${paymentId}/proof`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${u.tokens.accessToken}` },
                body: fd,
            }),
        );

        const reject = await api('POST', `/api/admin/payments/${paymentId}/proof/reject`, {
            token: admin.token,
            body: { reason: 'Screenshot is unreadable' },
        });
        expect(reject.status).toBe(200);

        const notif = await lastNotification(u.tokens.accessToken);
        expect(notif?.type).toBe('proof_rejected');
        expect(notif?.body).toContain('unreadable');

        // Payment failed but contribution still pending; user re-uploads a clearer proof
        const retry = multipart({ file: { content: PNG_BYTES, name: 'clearer.png', type: 'image/png' } });
        const reup = await SELF.fetch(
            new Request(`http://localhost/api/payments/${paymentId}/proof`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${u.tokens.accessToken}` },
                body: retry,
            }),
        );
        expect(reup.status).toBe(200);

        const approve = await api('POST', `/api/admin/payments/${paymentId}/proof/approve`, {
            token: admin.token,
            body: { note: 'Clearer screenshot accepted' },
        });
        expect(approve.status).toBe(200);

        const contribAfter = await api('GET', `/api/contributions/${contrib.id}`, { token: u.tokens.accessToken });
        expect(contribAfter.body.data.contribution.status).toBe('paid');
    });

    it('rejects wrong-type proof uploads', async () => {
        const u = await registerUser();
        const contrib = await makeContribution(u.tokens.accessToken, 100);
        const init = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        const paymentId = init.body.data.payment.id;

        const badType = multipart({ file: { content: new Blob([new TextEncoder().encode('plain text')], { type: 'text/plain' }), name: 'note.txt' } });
        const res = await SELF.fetch(
            new Request(`http://localhost/api/payments/${paymentId}/proof`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${u.tokens.accessToken}` },
                body: badType,
            }),
        );
        expect(res.status).toBe(415);
    });
});

describe('payments — gateway verify + webhook', () => {
    it('verify is idempotent for completed payments', async () => {
        const u = await registerUser();
        const contrib = await makeContribution(u.tokens.accessToken, 3000);
        const init = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        const id = init.body.data.payment.id;
        await api('POST', `/api/payments/${id}/charge`, { token: u.tokens.accessToken, body: GOOD_CARD });

        const v1 = await api('POST', `/api/payments/${id}/verify`, { token: u.tokens.accessToken });
        expect(v1.status).toBe(200);
        expect(v1.body.data.payment.status).toBe('completed');
        const v2 = await api('POST', `/api/payments/${id}/verify`, { token: u.tokens.accessToken });
        expect(v2.body.data.verified).toBe(true);
    });

    it('rejects webhook calls without the shared secret', async () => {
        const res = await SELF.fetch(
            new Request('http://localhost/api/payments/webhooks/paystack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong' },
                body: JSON.stringify({ event: 'charge.success', data: { reference: 'x', gateway_reference: 'y' } }),
            }),
        );
        // Webhook secret not configured in tests → 403 (webhooks disabled)
        expect([401, 403]).toContain(res.status);
    });
});

describe('payments — lifecycle guards & monthly recurrence', () => {
    it('blocks a second initiation while a payment is in flight', async () => {
        const u = await registerUser();
        const contrib = await makeContribution(u.tokens.accessToken, 1000);
        const first = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        expect(first.status).toBe(201);
        const second = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        expect(second.status).toBe(409);
        expect(second.body.error.code).toBe('payment_in_flight');
    });

    it('monthly contribution rolls into the next month when settled', async () => {
        const u = await registerUser();
        const due = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
        const created = await api('POST', '/api/contributions', {
            token: u.tokens.accessToken,
            body: { amount: 2000, dueDate: due, frequency: 'monthly', label: 'Rent share' },
        });
        expect(created.status).toBe(201);
        const contrib = created.body.data.contribution as { id: string };

        const init = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: contrib.id },
        });
        expect(init.status).toBe(201);
        const charge = await api('POST', `/api/payments/${init.body.data.payment.id}/charge`, {
            token: u.tokens.accessToken,
            body: GOOD_CARD,
        });
        expect(charge.status).toBe(200);
        expect(charge.body.data.payment.status).toBe('completed');

        // Original is paid, next installment created (same amount/label, due +1 month)
        const original = await api('GET', `/api/contributions/${contrib.id}`, { token: u.tokens.accessToken });
        expect(original.body.data.contribution.status).toBe('paid');

        const list = await api('GET', '/api/contributions?label=Rent', { token: u.tokens.accessToken });
        const next = (list.body.data.contributions as Array<Record<string, unknown>>).find((x) => x.id !== contrib.id);
        expect(next).toBeTruthy();
        expect(next?.frequency).toBe('monthly');
        expect(next?.status).toBe('pending');
        expect(next?.amount).toBe(2000);
        const expected = (() => {
            const d = new Date(due + 'T00:00:00Z');
            d.setUTCMonth(d.getUTCMonth() + 1);
            return d.toISOString().slice(0, 10);
        })();
        expect(next?.dueDate).toBe(expected);

        // The user is told a new installment is scheduled
        const listRes = await api('GET', '/api/notifications?limit=10', { token: u.tokens.accessToken });
        const types = (listRes.body.data.notifications as Array<{ type: string }>).map((n) => n.type);
        expect(types).toContain('installment_scheduled');
    });
});
