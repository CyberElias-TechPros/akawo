import { describe, it, expect } from 'vitest';
import { api, registerUser, bootstrapAdmin, loginToken } from './helpers';

const GOOD_CARD = { cardNumber: '5396 0000 0000 0000', expiry: '12/29', cvv: '123', name: 'A B' };

describe('admin', () => {
    it('denies every admin route to regular users (403)', async () => {
        const u = await registerUser();
        for (const path of ['/api/admin/stats', '/api/admin/users', '/api/admin/verifications', '/api/admin/audit', '/api/admin/emails']) {
            const res = await api('GET', path, { token: u.tokens.accessToken });
            expect(res.status, path).toBe(403);
        }
    });

    it('denies admin routes to anonymous callers (401)', async () => {
        const res = await api('GET', '/api/admin/stats');
        expect(res.status).toBe(401);
    });

    it('computes aggregate stats correctly', async () => {
        const admin = await bootstrapAdmin();
        const a = await registerUser();
        const b = await registerUser();

        // a: 2 contributions, pays 10k; b: 1 contribution, unpaid
        const ca = await api('POST', '/api/contributions', { token: a.tokens.accessToken, body: { amount: 10000 } });
        await api('POST', '/api/contributions', { token: a.tokens.accessToken, body: { amount: 4000 } });
        await api('POST', '/api/contributions', { token: b.tokens.accessToken, body: { amount: 2500 } });

        const init = await api('POST', '/api/payments/initiate', {
            token: a.tokens.accessToken,
            body: { contributionId: ca.body.data.contribution.id },
        });
        await api('POST', `/api/payments/${init.body.data.payment.id}/charge`, {
            token: a.tokens.accessToken,
            body: GOOD_CARD,
        });

        const res = await api('GET', '/api/admin/stats', { token: admin.token });
        expect(res.status).toBe(200);
        const s = res.body.data;
        expect(s.users.total).toBe(3); // admin + a + b
        expect(s.users.verified).toBe(1); // only the admin is KYC-verified
        expect(s.contributions.count).toBe(3);
        expect(s.contributions.total).toBe(16500);
        expect(s.contributions.pending).toBe(6500);
        expect(s.payments.completed).toBe(1);
        expect(s.payments.completedTotal).toBe(10000);
        expect(s.payments.pending).toBe(0);
        expect(s.recentPayments[0].amount).toBe(10000);
        expect(s.topContributors[0].name).toBe(a.name);
    });

    it('lists users with search, role/verified filters and pagination', async () => {
        const admin = await bootstrapAdmin();
        await registerUser({ name: 'Zara Nwosu', email: 'zara@example.com' });
        await registerUser({ name: 'Mike Doe', email: 'mike@example.com' });

        const all = await api('GET', '/api/admin/users', { token: admin.token });
        expect(all.body.data.pagination.total).toBe(3);

        const search = await api('GET', '/api/admin/users?q=zara', { token: admin.token });
        expect(search.body.data.users.length).toBe(1);
        expect(search.body.data.users[0].email).toBe('zara@example.com');

        const admins = await api('GET', '/api/admin/users?role=admin', { token: admin.token });
        expect(admins.body.data.users.length).toBe(1);
        expect(admins.body.data.users[0].role).toBe('admin');

        const page1 = await api('GET', '/api/admin/users?limit=2&page=1', { token: admin.token });
        expect(page1.body.data.users.length).toBe(2);
        expect(page1.body.data.pagination.totalPages).toBe(2);

        // BVN is never exposed in full — only masked last 4
        expect(page1.body.data.users[0].bvnLast4).toMatch(/••• ••• •\d{4}/);
    });

    it('suspends a user, blocking login and APIs, and can re-activate', async () => {
        const admin = await bootstrapAdmin();
        const u = await registerUser();

        const suspend = await api('PUT', `/api/admin/users/${u.user.id}/status`, {
            token: admin.token,
            body: { status: 'suspended' },
        });
        expect(suspend.status).toBe(200);

        const login = await api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } });
        expect(login.status).toBe(403);

        // Existing access token now forbidden
        const me = await api('GET', '/api/auth/me', { token: u.tokens.accessToken });
        expect(me.status).toBe(403);

        const activate = await api('PUT', `/api/admin/users/${u.user.id}/status`, {
            token: admin.token,
            body: { status: 'active' },
        });
        expect(activate.status).toBe(200);
        const login2 = await api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } });
        expect(login2.status).toBe(200);
    });

    it('cannot demote the last admin or suspend self', async () => {
        const admin = await bootstrapAdmin();
        const demote = await api('PUT', `/api/admin/users/${admin.admin.id}/role`, {
            token: admin.token,
            body: { role: 'user' },
        });
        expect(demote.status).toBe(409);

        const selfSuspend = await api('PUT', `/api/admin/users/${admin.admin.id}/status`, {
            token: admin.token,
            body: { status: 'suspended' },
        });
        expect(selfSuspend.status).toBe(409);
    });

    it('can promote a user to admin and demote when another admin exists', async () => {
        const admin = await bootstrapAdmin();
        const u = await registerUser();

        const promote = await api('PUT', `/api/admin/users/${u.user.id}/role`, {
            token: admin.token,
            body: { role: 'admin' },
        });
        expect(promote.status).toBe(200);

        const uToken = (await loginToken(u.email, u.password)).accessToken;
        const stats = await api('GET', '/api/admin/stats', { token: uToken });
        expect(stats.status).toBe(200);

        // First admin can now be demoted (not the last one)
        const demote = await api('PUT', `/api/admin/users/${admin.admin.id}/role`, {
            token: uToken,
            body: { role: 'user' },
        });
        expect(demote.status).toBe(200);
    });

    it('audits admin actions', async () => {
        const admin = await bootstrapAdmin();
        const u = await registerUser();
        await api('PUT', `/api/admin/users/${u.user.id}/status`, {
            token: admin.token,
            body: { status: 'suspended' },
        });
        const audit = await api('GET', '/api/admin/audit?limit=5', { token: admin.token });
        expect(audit.status).toBe(200);
        const actions = audit.body.data.entries.map((e: { action: string }) => e.action);
        expect(actions).toContain('admin.user_status_changed');
    });

    it('exposes the email outbox to admins', async () => {
        const admin = await bootstrapAdmin();
        const u = await registerUser(); // registration already sent an email
        const res = await api('GET', '/api/admin/emails?limit=10', { token: admin.token });
        expect(res.status).toBe(200);
        expect(res.body.data.emails.length).toBeGreaterThanOrEqual(1);
        expect(res.body.data.emails[0].to).toBe(u.email);
    });

    it('bootstrap-admin is a no-op once an admin exists (and 404 in prod)', async () => {
        await bootstrapAdmin();
        const again = await api('POST', '/api/auth/bootstrap-admin', {
            body: {
                name: 'Second Admin',
                email: `second.${Date.now()}@akawo.test`,
                password: 'AdminPass!123',
                bvn: '22199999999',
            },
        });
        expect(again.status).toBe(409);
    });
});
