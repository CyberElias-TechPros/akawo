#!/usr/bin/env node
/**
 * Akawo local development seed.
 *
 * Seeds a demo admin and three demo users (one with a completed card payment)
 * entirely through the public API, so every record is created the same way
 * real traffic creates it. Idempotent: re-running skips what already exists.
 *
 * Prerequisites:
 *   1. `npm run dev`  (wrangler dev on port 8787, reads .dev.vars → LOCAL_DEV=true)
 *   2. `npm run db:migrate:local`  (or just wait — the worker self-bootstraps the schema)
 *
 * Usage:  npm run db:seed        (local only — production has LOCAL_DEV=false,
 *                                 so /api/auth/bootstrap-admin returns 404 by design
 *                                 and remote seeding is intentionally impossible)
 */

const BASE = process.env.API_URL || 'http://localhost:8787';

const ADMIN = { name: 'Akawo Admin', email: 'admin@akawo.dev', password: 'Akawo#Admin1', bvn: '22190000111' };
const GOOD_CARD = {
    cardNumber: '5396 0000 0000 0000',
    expiry: '12/28',
    cvv: '424',
    name: 'CHINEDU OKAFOR',
};
const USERS = [
    { name: 'Chinedu Okafor', email: 'chinedu@akawo.dev', bvn: '22191111001', amount: 50000, dueInDays: 14, payByCard: true },
    { name: 'Amina Bello', email: 'amina@akawo.dev', bvn: '22192222002', amount: 25000, dueInDays: 7 },
    { name: 'Tunde Adeyemi', email: 'tunde@akawo.dev', bvn: '22193333003', amount: 12000, dueInDays: 3 },
];
const PASSWORD = 'Akawo#Demo1';

const isoInDays = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const fmt = (ngn) => `₦${ngn.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

async function api(method, path, { token, body } = {}) {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
}

function section(title) {
    console.log(`\n${'─'.repeat(60)}\n${title}\n${'─'.repeat(60)}`);
}

async function main() {
    section(`Seeding Akawo @ ${BASE}`);

    // 0. Dev server up?
    const health = await api('GET', '/api/health');
    if (health.status !== 200) {
        console.error(`✗ API is not reachable at ${BASE} (status ${health.status}).`);
        console.error('  Start the dev server first:  npm run dev');
        process.exit(1);
    }
    if (health.data?.data?.gatewayMode !== 'mock') {
        console.error(`✗ Expected gatewayMode=mock in local dev, got ${health.data?.data?.gatewayMode}.`);
        process.exit(1);
    }

    // 1. Admin (idempotent — 409 means already seeded).
    const boot = await api('POST', '/api/auth/bootstrap-admin', { body: ADMIN });
    if (boot.status === 404) {
        console.error('✗ /api/auth/bootstrap-admin returned 404 — LOCAL_DEV is not "true".');
        console.error('  This seed is local-only by design (see .dev.vars).');
        process.exit(1);
    }
    console.log(boot.status === 409 ? '✓ Admin already exists (skipped)' : `✓ Admin created: ${ADMIN.email}`);

    let adminToken;
    {
        const login = await api('POST', '/api/auth/login', { body: { email: ADMIN.email, password: ADMIN.password } });
        if (login.status !== 200) {
            console.error(`✗ Admin login failed (${login.status}): ${JSON.stringify(login.data?.error)}`);
            process.exit(1);
        }
        adminToken = login.data.data.tokens.accessToken;
    }

    // 2. Demo users: register → verify email (dev link) → contribution.
    for (const u of USERS) {
        const reg = await api('POST', '/api/auth/register', {
            body: { name: u.name, email: u.email, password: PASSWORD, bvn: u.bvn },
        });

        let tokens;
        if (reg.status === 201) {
            console.log(`✓ Registered ${u.email}`);
            tokens = reg.data.data.tokens;

            const devUrl = reg.data.data.emailVerification?.devUrl;
            if (devUrl) {
                const token = new URL(devUrl).searchParams.get('token');
                const ver = await api('POST', '/api/auth/verify-email', { body: { token } });
                console.log(ver.status === 200 ? `✓ Email verified for ${u.email}` : `! Email verify ${ver.status} for ${u.email}`);
            }
        } else if (reg.status === 409) {
            const login = await api('POST', '/api/auth/login', { body: { email: u.email, password: PASSWORD } });
            if (login.status !== 200) {
                console.error(`✗ ${u.email} exists but login failed (${login.status}) — password mismatch?`);
                process.exit(1);
            }
            console.log(`✓ ${u.email} already exists (skipped)`);
            tokens = login.data.data.tokens;
        } else {
            console.error(`✗ Register ${u.email} failed (${reg.status}): ${JSON.stringify(reg.data?.error)}`);
            process.exit(1);
        }

        // Contribution — skip if the user already has one (keeps re-seeds clean).
        const list = await api('GET', '/api/contributions', { token: tokens.accessToken });
        if (list.data?.data?.contributions?.length > 0) {
            console.log(`  · ${u.email} already has contributions (skipped)`);
            continue;
        }
        const due = isoInDays(u.dueInDays);
        const contrib = await api('POST', '/api/contributions', {
            token: tokens.accessToken,
            body: { amount: u.amount, dueDate: due },
        });
        if (contrib.status !== 201) {
            console.error(`✗ Contribution for ${u.email} failed (${contrib.status}): ${JSON.stringify(contrib.data?.error)}`);
            process.exit(1);
        }
        console.log(`  · Contribution ${fmt(u.amount)} due ${due}`);

        // One user gets a fully paid contribution (initiate → mock card charge).
        if (u.payByCard) {
            const init = await api('POST', '/api/payments/initiate', {
                token: tokens.accessToken,
                body: { contributionId: contrib.data.data.contribution.id },
            });
            if (init.status !== 201 && init.status !== 200) {
                console.error(`✗ Payment initiation failed (${init.status}): ${JSON.stringify(init.data?.error)}`);
                process.exit(1);
            }
            const paymentId = init.data.data.payment.id;
            const charge = await api('POST', `/api/payments/${paymentId}/charge`, {
                token: tokens.accessToken,
                body: GOOD_CARD,
            });
            if (charge.status !== 200 || charge.data.data.payment.status !== 'completed') {
                console.error(`✗ Card charge failed (${charge.status}): ${JSON.stringify(charge.data)}`);
                process.exit(1);
            }
            console.log(`  · Paid ${fmt(u.amount)} by card — reference ${charge.data.data.payment.reference ?? charge.data.data.payment.gatewayReference ?? 'n/a'}`);
        }
    }

    // 3. Summary from the admin dashboard.
    const stats = await api('GET', '/api/admin/stats', { token: adminToken });
    const s = stats.data?.data;
    section('Seed complete');
    console.log(`Users:          ${s?.users?.total ?? '?'} total, ${s?.users?.verified ?? '?'} KYC-verified`);
    console.log(`Contributions:  ${s?.contributions?.count ?? '?'} total — ${fmt(s?.contributions?.total ?? 0)} value, ${fmt(s?.contributions?.pending ?? 0)} pending`);
    console.log(`Payments:       ${s?.payments?.completed ?? 0} completed (${fmt(s?.payments?.completedTotal ?? 0)}), ${s?.payments?.pending ?? 0} pending, ${s?.payments?.failed ?? 0} failed`);
    console.log(`KYC queue:      ${s?.verifications?.pending ?? 0} pending`);
    console.log('');
    console.log('Demo logins (password for all users: %s):', PASSWORD);
    console.log(`  Admin  → ${ADMIN.email}`);
    for (const u of USERS) console.log(`  User   → ${u.email}`);
    console.log('');
    console.log(`Frontend:  npm run dev   (http://localhost:5173, proxies /api → ${BASE})`);
}

main().catch((err) => {
    console.error('✗ Seed failed:', err.message ?? err);
    process.exit(1);
});
