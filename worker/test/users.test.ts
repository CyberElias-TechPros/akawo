import { describe, it, expect } from 'vitest';
import { api, registerUser } from './helpers';

const GOOD_CARD = { cardNumber: '5396 0000 0000 0000', expiry: '12/29', cvv: '123', name: 'Ada' };

describe('users', () => {
    describe('dashboard', () => {
        it('returns coherent summary for a fresh user', async () => {
            const u = await registerUser();
            const res = await api('GET', '/api/users/dashboard', { token: u.tokens.accessToken });
            expect(res.status).toBe(200);
            const d = res.body.data;
            expect(d.summary.totalContributed).toBe(0);
            expect(d.summary.pendingCount).toBe(0);
            expect(d.nextContribution).toBeNull();
            expect(d.unreadNotifications).toBe(0);
            expect(d.verification.isVerified).toBe(false);
        });

        it('tracks pending amounts and next contribution with overdue flag', async () => {
            const u = await registerUser();
            await api('POST', '/api/contributions', {
                token: u.tokens.accessToken,
                body: { amount: 1500, dueDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10) },
            });
            await api('POST', '/api/contributions', {
                token: u.tokens.accessToken,
                body: { amount: 4000, dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) },
            });

            const res = await api('GET', '/api/users/dashboard', { token: u.tokens.accessToken });
            expect(res.body.data.summary.pendingAmount).toBe(5500);
            expect(res.body.data.summary.pendingCount).toBe(2);
            expect(res.body.data.nextContribution.overdue).toBe(true); // due yesterday
            expect(res.body.data.recentContributions.length).toBe(2);
        });

        it('dashboard never leaks other users’ data', async () => {
            const a = await registerUser();
            const b = await registerUser();
            const c = await api('POST', '/api/contributions', { token: a.tokens.accessToken, body: { amount: 77777 } });
            await api('POST', `/api/payments/initiate`, {
                token: a.tokens.accessToken,
                body: { contributionId: c.body.data.contribution.id },
            }).then(async (init) => {
                await api('POST', `/api/payments/${init.body.data.payment.id}/charge`, {
                    token: a.tokens.accessToken,
                    body: GOOD_CARD,
                });
            });

            const dashB = await api('GET', '/api/users/dashboard', { token: b.tokens.accessToken });
            expect(dashB.body.data.summary.totalContributed).toBe(0);
            expect(JSON.stringify(dashB.body)).not.toContain('77777');
        });
    });

    describe('profile', () => {
        it('updates name and phone with validation', async () => {
            const u = await registerUser();
            const ok = await api('PUT', '/api/users/profile', {
                token: u.tokens.accessToken,
                body: { name: 'Ada Nwosu', phone: '+2348031234567' },
            });
            expect(ok.status).toBe(200);
            expect(ok.body.data.user.name).toBe('Ada Nwosu');
            expect(ok.body.data.user.phone).toBe('+2348031234567');

            const bad = await api('PUT', '/api/users/profile', {
                token: u.tokens.accessToken,
                body: { phone: '12345' },
            });
            expect(bad.status).toBe(422);
        });

        it('does not let profile edits touch sensitive fields', async () => {
            const u = await registerUser();
            const res = await api('PUT', '/api/users/profile', {
                token: u.tokens.accessToken,
                body: { name: 'Hacked', email: 'evil@evil.com', role: 'admin', isVerified: true, bvn: '99999999999' },
            });
            expect(res.status).toBe(200);
            const me = await api('GET', '/api/auth/me', { token: u.tokens.accessToken });
            expect(me.body.data.user.email).toBe(u.email);
            expect(me.body.data.user.role).toBe('user');
            expect(me.body.data.user.isVerified).toBe(false);
        });
    });

    describe('password change', () => {
        it('changes password, invalidates all refresh sessions, keeps access token until expiry', async () => {
            const u = await registerUser();
            const wrong = await api('PUT', '/api/users/password', {
                token: u.tokens.accessToken,
                body: { currentPassword: 'WrongPass1!', newPassword: 'BrandNew1!' },
            });
            expect(wrong.status).toBe(400);
            expect(wrong.body.error.code).toBe('wrong_password');

            const ok = await api('PUT', '/api/users/password', {
                token: u.tokens.accessToken,
                body: { currentPassword: u.password, newPassword: 'BrandNew1!' },
            });
            expect(ok.status).toBe(200);
            expect(ok.body.data.mustReauthenticate).toBe(true);

            const refresh = await api('POST', '/api/auth/refresh', { body: { refreshToken: u.tokens.refreshToken } });
            expect(refresh.status).toBe(401);

            const login = await api('POST', '/api/auth/login', { body: { email: u.email, password: 'BrandNew1!' } });
            expect(login.status).toBe(200);
        });
    });
});

describe('notifications', () => {
    it('lists, counts and marks notifications', async () => {
        const u = await registerUser();
        // Trigger a notification: create + complete a payment
        const c = await api('POST', '/api/contributions', { token: u.tokens.accessToken, body: { amount: 100 } });
        const init = await api('POST', '/api/payments/initiate', {
            token: u.tokens.accessToken,
            body: { contributionId: c.body.data.contribution.id },
        });
        await api('POST', `/api/payments/${init.body.data.payment.id}/charge`, {
            token: u.tokens.accessToken,
            body: GOOD_CARD,
        });

        const list = await api('GET', '/api/notifications', { token: u.tokens.accessToken });
        expect(list.status).toBe(200);
        expect(list.body.data.notifications.length).toBeGreaterThanOrEqual(1);

        const count = await api('GET', '/api/notifications/unread-count', { token: u.tokens.accessToken });
        expect(count.body.data.count).toBeGreaterThanOrEqual(1);

        const first = list.body.data.notifications[0];
        const read = await api('POST', `/api/notifications/${first.id}/read`, { token: u.tokens.accessToken });
        expect(read.status).toBe(200);

        const all = await api('POST', '/api/notifications/read-all', { token: u.tokens.accessToken });
        expect(all.status).toBe(200);
        const count2 = await api('GET', '/api/notifications/unread-count', { token: u.tokens.accessToken });
        expect(count2.body.data.count).toBe(0);
    });

    it('users cannot see or touch other users’ notifications', async () => {
        const a = await registerUser();
        const b = await registerUser();
        // A generates a notification
        const c = await api('POST', '/api/contributions', { token: a.tokens.accessToken, body: { amount: 100 } });
        const init = await api('POST', '/api/payments/initiate', {
            token: a.tokens.accessToken,
            body: { contributionId: c.body.data.contribution.id },
        });
        await api('POST', `/api/payments/${init.body.data.payment.id}/charge`, {
            token: a.tokens.accessToken,
            body: GOOD_CARD,
        });

        const listA = await api('GET', '/api/notifications', { token: a.tokens.accessToken });
        expect(listA.body.data.notifications.length).toBeGreaterThanOrEqual(1);

        // B sees none of A's
        const listB = await api('GET', '/api/notifications', { token: b.tokens.accessToken });
        expect(listB.body.data.notifications.length).toBe(0);
        const countB = await api('GET', '/api/notifications/unread-count', { token: b.tokens.accessToken });
        expect(countB.body.data.count).toBe(0);

        // B cannot mark an unknown notification read (no ID leakage → 404)
        const mark = await api('POST', `/api/notifications/${listA.body.data.notifications[0].id}/read`, {
            token: b.tokens.accessToken,
        });
        expect([403, 404]).toContain(mark.status);
    });
});
