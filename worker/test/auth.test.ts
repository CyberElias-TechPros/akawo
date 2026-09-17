import { describe, it, expect } from 'vitest';
import { api, registerUser, bootstrapAdmin, unique } from './helpers';

describe('auth', () => {
    describe('register', () => {
        it('registers a valid user and returns safe user + tokens', async () => {
            const { status, body } = await api('POST', '/api/auth/register', {
                body: {
                    name: 'Chinedu Okafor',
                    email: 'chinedu@akawo.test',
                    password: 'Sup3rSecret!',
                    bvn: '22199988877',
                    phone: '08031234567',
                },
            });
            expect(status).toBe(201);
            expect(body.success).toBe(true);
            const { user, tokens, emailVerification } = body.data;
            expect(user.name).toBe('Chinedu Okafor');
            expect(user.email).toBe('chinedu@akawo.test');
            expect(user.bvnLast4).toBe('8877');
            expect(user.emailVerified).toBe(false);
            expect(user.isVerified).toBe(false);
            expect(user.role).toBe('user');
            // No sensitive fields leak
            expect(user.password).toBeUndefined();
            expect(user.bvn).toBeUndefined();
            expect(tokens.accessToken).toBeTruthy();
            expect(tokens.refreshToken).toBeTruthy();
            expect(emailVerification.sent).toBe(true);
            expect(emailVerification.devUrl).toContain('/verify-email?token=');

            // The full password and BVN never appear anywhere in the response
            const raw = JSON.stringify(body);
            expect(raw).not.toContain('Sup3rSecret!');
            expect(raw).not.toContain('22199988877');
        });

        it('rejects invalid input with a 422 and field messages', async () => {
            const { status, body } = await api('POST', '/api/auth/register', {
                body: { name: 'A', email: 'bad', password: 'short', bvn: '123' },
            });
            expect(status).toBe(422);
            expect(body.error.code).toBe('validation');
            expect(body.error.message).toMatch(/email/i);
            expect(body.error.message).toMatch(/password/i);
            expect(body.error.message).toMatch(/BVN/i);
        });

        it('rejects duplicate email with 409 and a specific code', async () => {
            const tag = unique();
            const email = `dupe.${tag}@example.com`;
            await registerUser({ email });
            const { status, body } = await api('POST', '/api/auth/register', {
                body: { name: 'Someone Else', email, password: 'Sup3rSecret!', bvn: '22199990002' },
            });
            expect(status).toBe(409);
            expect(body.error.code).toBe('email_taken');
        });

        it('rejects a BVN already used by another account', async () => {
            const tag = unique();
            const bvn = `2219${String(Math.floor(Math.random() * 10_000_000)).padStart(7, '0')}`;
            await registerUser({ email: `bvn.${tag}@example.com`, bvn });
            const { status, body } = await api('POST', '/api/auth/register', {
                body: { name: 'Twin', email: `twin.${tag}@example.com`, password: 'Sup3rSecret!', bvn },
            });
            expect(status).toBe(409);
            expect(body.error.code).toBe('bvn_taken');
        });
    });

    describe('login', () => {
        it('logs in with valid credentials', async () => {
            const u = await registerUser();
            const { status, body } = await api('POST', '/api/auth/login', {
                body: { email: u.email, password: u.password },
            });
            expect(status).toBe(200);
            expect(body.data.user.email).toBe(u.email);
            expect(body.data.tokens.accessToken).toBeTruthy();
        });

        it('returns the same error for unknown email and wrong password (anti-enumeration)', async () => {
            const u = await registerUser();
            const noUser = await api('POST', '/api/auth/login', {
                body: { email: `ghost.${unique()}@example.com`, password: 'WrongPass1' },
            });
            const wrongPw = await api('POST', '/api/auth/login', {
                body: { email: u.email, password: 'WrongPass1' },
            });
            expect(noUser.status).toBe(401);
            expect(wrongPw.status).toBe(401);
            expect(noUser.body.error.message).toBe(wrongPw.body.error.message);
            expect(wrongPw.body.error.code).toBe('invalid_credentials');
        });

        it('records last login', async () => {
            const u = await registerUser();
            expect(u.user.lastLoginAt).toBeNull();
            await api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } });
            const me = await api('GET', '/api/auth/me', { token: u.tokens.accessToken });
            expect(me.body.data.user.lastLoginAt).toBeTruthy();
        });
    });

    describe('me / token guard', () => {
        it('returns the current user with a valid token', async () => {
            const u = await registerUser();
            const { status, body } = await api('GET', '/api/auth/me', { token: u.tokens.accessToken });
            expect(status).toBe(200);
            expect(body.data.user.id).toBe(u.user.id);
        });

        it('rejects missing and malformed tokens', async () => {
            const noAuth = await api('GET', '/api/auth/me');
            expect(noAuth.status).toBe(401);
            const bad = await api('GET', '/api/auth/me', { token: 'garbage.token.here' });
            expect(bad.status).toBe(401);
        });

        it('rejects a token whose user is suspended', async () => {
            const u = await registerUser();
            const admin = await bootstrapAdmin();
            await api('PUT', `/api/admin/users/${u.user.id}/status`, {
                token: admin.token,
                body: { status: 'suspended' },
            });
            const me = await api('GET', '/api/auth/me', { token: u.tokens.accessToken });
            expect(me.status).toBe(403);
            // and cannot log in again
            const login = await api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } });
            expect(login.status).toBe(403);
        });
    });

    describe('refresh token rotation', () => {
        it('rotates the refresh token and revokes the old one', async () => {
            const u = await registerUser();
            const r1 = await api('POST', '/api/auth/refresh', { body: { refreshToken: u.tokens.refreshToken } });
            expect(r1.status).toBe(200);
            const newRefresh = r1.body.data.tokens.refreshToken;
            expect(newRefresh).not.toBe(u.tokens.refreshToken);

            // Old token is now revoked
            const reuse = await api('POST', '/api/auth/refresh', { body: { refreshToken: u.tokens.refreshToken } });
            expect(reuse.status).toBe(401);

            // Reuse of a rotated token must kill the whole family (the new one too)
            const afterReuse = await api('POST', '/api/auth/refresh', { body: { refreshToken: newRefresh } });
            expect(afterReuse.status).toBe(401);
        });

        it('rejects unknown refresh tokens', async () => {
            const { status } = await api('POST', '/api/auth/refresh', { body: { refreshToken: 'not-a-real-token' } });
            expect(status).toBe(401);
        });
    });

    describe('email verification', () => {
        it('verifies with a valid token and flips the flag', async () => {
            const u = await registerUser();
            const token = new URL(u.verifyUrl!).searchParams.get('token')!;
            const { status, body } = await api('POST', '/api/auth/verify-email', { body: { token } });
            expect(status).toBe(200);
            expect(body.data.verified).toBe(true);

            const me = await api('GET', '/api/auth/me', { token: u.tokens.accessToken });
            expect(me.body.data.user.emailVerified).toBe(true);
        });

        it('rejects a used or invalid token', async () => {
            const u = await registerUser();
            const token = new URL(u.verifyUrl!).searchParams.get('token')!;
            await api('POST', '/api/auth/verify-email', { body: { token } });
            const again = await api('POST', '/api/auth/verify-email', { body: { token } });
            expect(again.status).toBe(400);
            const bogus = await api('POST', '/api/auth/verify-email', { body: { token: 'bogus' } });
            expect(bogus.status).toBe(400);
        });
    });

    describe('password reset', () => {
        it('full happy path: forgot → reset → new password works, old fails, sessions revoked', async () => {
            const u = await registerUser();
            const fp = await api('POST', '/api/auth/forgot-password', { body: { email: u.email } });
            expect(fp.status).toBe(200);
            const resetUrl = fp.body.data.devResetUrl;
            expect(resetUrl).toContain('/reset-password?token=');
            const token = new URL(resetUrl).searchParams.get('token')!;

            // Old refresh token should still work BEFORE reset
            const before = await api('POST', '/api/auth/refresh', { body: { refreshToken: u.tokens.refreshToken } });
            expect(before.status).toBe(200);

            const rp = await api('POST', '/api/auth/reset-password', { body: { token, password: 'N3wPassword!' } });
            expect(rp.status).toBe(200);

            const oldLogin = await api('POST', '/api/auth/login', { body: { email: u.email, password: u.password } });
            expect(oldLogin.status).toBe(401);
            const newLogin = await api('POST', '/api/auth/login', { body: { email: u.email, password: 'N3wPassword!' } });
            expect(newLogin.status).toBe(200);

            // All pre-reset refresh sessions were revoked
            const oldRefresh = await api('POST', '/api/auth/refresh', { body: { refreshToken: before.body.data.tokens.refreshToken } });
            expect(oldRefresh.status).toBe(401);
        });

        it('never reveals whether an email exists', async () => {
            const known = await registerUser();
            const a = await api('POST', '/api/auth/forgot-password', { body: { email: known.email } });
            const b = await api('POST', '/api/auth/forgot-password', { body: { email: `nobody.${unique()}@example.com` } });
            expect(a.status).toBe(b.status);
            expect(a.body.data.message).toBe(b.body.data.message);
            expect(b.body.data.devResetUrl).toBeUndefined();
            expect(a.body.data.devResetUrl).toBeTruthy();
        });

        it('a reset token can be used only once', async () => {
            const u = await registerUser();
            const fp = await api('POST', '/api/auth/forgot-password', { body: { email: u.email } });
            const token = new URL(fp.body.data.devResetUrl).searchParams.get('token')!;
            const first = await api('POST', '/api/auth/reset-password', { body: { token, password: 'BrandNew1!' } });
            expect(first.status).toBe(200);
            const second = await api('POST', '/api/auth/reset-password', { body: { token, password: 'AnotherOne2!' } });
            expect(second.status).toBe(400);
        });
    });

    describe('logout', () => {
        it('revokes the presented refresh token', async () => {
            const u = await registerUser();
            const out = await api('POST', '/api/auth/logout', {
                token: u.tokens.accessToken,
                body: { refreshToken: u.tokens.refreshToken },
            });
            expect(out.status).toBe(200);
            const reuse = await api('POST', '/api/auth/refresh', { body: { refreshToken: u.tokens.refreshToken } });
            expect(reuse.status).toBe(401);
        });
    });
});
