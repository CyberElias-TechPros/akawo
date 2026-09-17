import { describe, it, expect } from 'vitest';
import { api, registerUser } from './helpers';

const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

describe('contributions', () => {
    it('requires authentication', async () => {
        const { status } = await api('GET', '/api/contributions');
        expect(status).toBe(401);
    });

    it('creates a contribution and lists it back', async () => {
        const u = await registerUser();
        const created = await api('POST', '/api/contributions', {
            token: u.tokens.accessToken,
            body: { amount: 25000, label: 'Sabbath fund', dueDate: daysFromNow(7) },
        });
        expect(created.status).toBe(201);
        expect(created.body.data.contribution.amount).toBe(25000);
        expect(created.body.data.contribution.status).toBe('pending');
        expect(created.body.data.contribution.label).toBe('Sabbath fund');

        const list = await api('GET', '/api/contributions', { token: u.tokens.accessToken });
        expect(list.status).toBe(200);
        expect(list.body.data.pagination.total).toBe(1);
        expect(list.body.data.contributions[0].id).toBe(created.body.data.contribution.id);
    });

    it('validates amount bounds and precision', async () => {
        const u = await registerUser();
        const tooSmall = await api('POST', '/api/contributions', { token: u.tokens.accessToken, body: { amount: 0.5 } });
        expect(tooSmall.status).toBe(422);
        const tooBig = await api('POST', '/api/contributions', { token: u.tokens.accessToken, body: { amount: 99_000_000 } });
        expect(tooBig.status).toBe(422);
        const precision = await api('POST', '/api/contributions', { token: u.tokens.accessToken, body: { amount: 10.123 } });
        expect(precision.status).toBe(422);
        const nonNumeric = await api('POST', '/api/contributions', { token: u.tokens.accessToken, body: { amount: 'abc' } });
        expect(nonNumeric.status).toBe(422);
    });

    it('rejects past due dates', async () => {
        const u = await registerUser();
        const { status } = await api('POST', '/api/contributions', {
            token: u.tokens.accessToken,
            body: { amount: 100, dueDate: '2020-01-01' },
        });
        expect(status).toBe(422);
    });

    it('round-trips amounts with exact precision (integer kobo, no float drift)', async () => {
        const u = await registerUser();
        const created = await api('POST', '/api/contributions', { token: u.tokens.accessToken, body: { amount: 1.29 } });
        expect(created.body.data.contribution.amount).toBe(1.29);
        const fetched = await api('GET', `/api/contributions/${created.body.data.contribution.id}`, { token: u.tokens.accessToken });
        expect(fetched.body.data.contribution.amount).toBe(1.29);
    });

    it('lets a user update label/date/frequency while pending', async () => {
        const u = await registerUser();
        const c = await api('POST', '/api/contributions', {
            token: u.tokens.accessToken,
            body: { amount: 5000, dueDate: daysFromNow(3) },
        });
        const id = c.body.data.contribution.id;
        const updated = await api('PUT', `/api/contributions/${id}`, {
            token: u.tokens.accessToken,
            body: { label: 'Tithes', frequency: 'monthly', dueDate: daysFromNow(10) },
        });
        expect(updated.status).toBe(200);
        expect(updated.body.data.contribution.label).toBe('Tithes');
        expect(updated.body.data.contribution.frequency).toBe('monthly');
        expect(updated.body.data.contribution.dueDate).toBe(daysFromNow(10));
    });

    it('enforces ownership — other users cannot read or mutate (IDOR)', async () => {
        const a = await registerUser();
        const b = await registerUser();
        const c = await api('POST', '/api/contributions', {
            token: a.tokens.accessToken,
            body: { amount: 1000 },
        });
        const id = c.body.data.contribution.id;

        const read = await api('GET', `/api/contributions/${id}`, { token: b.tokens.accessToken });
        expect(read.status).toBe(403);
        const update = await api('PUT', `/api/contributions/${id}`, {
            token: b.tokens.accessToken,
            body: { label: 'hacked' },
        });
        expect(update.status).toBe(403);
        const del = await api('DELETE', `/api/contributions/${id}`, { token: b.tokens.accessToken });
        expect(del.status).toBe(403);

        // original still intact
        const mine = await api('GET', `/api/contributions/${id}`, { token: a.tokens.accessToken });
        expect(mine.status).toBe(200);
    });

    it('supports status filtering and pagination', async () => {
        const u = await registerUser();
        for (let i = 0; i < 3; i++) {
            await api('POST', '/api/contributions', { token: u.tokens.accessToken, body: { amount: 100 + i } });
        }
        const page1 = await api('GET', '/api/contributions?limit=2&page=1', { token: u.tokens.accessToken });
        expect(page1.body.data.contributions.length).toBe(2);
        expect(page1.body.data.pagination.totalPages).toBe(2);
        const page2 = await api('GET', '/api/contributions?limit=2&page=2', { token: u.tokens.accessToken });
        expect(page2.body.data.contributions.length).toBe(1);
        const filtered = await api('GET', '/api/contributions?status=pending', { token: u.tokens.accessToken });
        expect(filtered.body.data.pagination.total).toBe(3);
    });

    it('deletes a pending contribution', async () => {
        const u = await registerUser();
        const c = await api('POST', '/api/contributions', { token: u.tokens.accessToken, body: { amount: 200 } });
        const del = await api('DELETE', `/api/contributions/${c.body.data.contribution.id}`, { token: u.tokens.accessToken });
        expect(del.status).toBe(200);
        const gone = await api('GET', `/api/contributions/${c.body.data.contribution.id}`, { token: u.tokens.accessToken });
        expect(gone.status).toBe(404);
    });
    it('blocks deletion while a payment is in flight', async () => {
        const u = await registerUser();
        const c = await api('POST', '/api/contributions', { token: u.tokens.accessToken, body: { amount: 500 } });
        expect(c.status).toBe(201);
        const init = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: c.body.data.contribution.id },
        });
        expect(init.status).toBe(201);
        const del = await api('DELETE', `/api/contributions/${c.body.data.contribution.id}`, { token: u.tokens.accessToken });
        expect(del.status).toBe(409);
        expect(del.body.error.code).toBe('payment_in_flight');
    });

    it('filters the list by label', async () => {
        const u = await registerUser();
        const ca = await api('POST', '/api/contributions', { token: u.tokens.accessToken, body: { amount: 100, label: 'School fees' } });
        await api('POST', '/api/contributions', { token: u.tokens.accessToken, body: { amount: 200, label: 'Data subscription' } });
        const res = await api('GET', '/api/contributions?label=School', { token: u.tokens.accessToken });
        expect(res.status).toBe(200);
        const rows = res.body.data.contributions as Array<{ id: string }>;
        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe(ca.body.data.contribution.id);
    });
});
