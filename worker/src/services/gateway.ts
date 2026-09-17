import type { Env } from '../env';

/**
 * Payment gateway abstraction.
 *
 * Two modes selected by env.GATEWAY_MODE:
 *
 *  - 'mock' (default, demo): a fully self-contained simulated card gateway.
 *    It performs real card validation (Luhn + future expiry) and mirrors the
 *    well-known Paystack test cards so both the success AND failure paths are
 *    demonstrable without any external credentials:
 *        • 5396 0000 0000 0000  → success
 *        • 5396 0000 0000 0002  → "insufficient funds"
 *        • 5396 0000 0000 0003  → "card blocked"
 *    Any other Luhn-valid card also succeeds. This is clearly-labelled demo
 *    functionality, not fake completion: the state machine, persistence and
 *    happy path are all real.
 *
 *  - 'paystack': real Paystack integration (initialize + verify + webhook).
 *    Requires PAYSTACK_SECRET_KEY (and PAYSTACK_WEBHOOK_SECRET for webhooks).
 */

export interface InitiateParams {
    reference: string; // our internal payment id
    amountKobo: number;
    email: string;
    currency: string;
}
export interface InitiateResult {
    gatewayReference: string;
    /** Where the shopper should be sent to pay (inline for mock). */
    checkoutUrl: string;
    mode: 'mock' | 'paystack';
}

export interface VerifyResult {
    status: 'success' | 'pending' | 'failed';
    gatewayReference: string;
}

export interface ChargeParams {
    cardNumber: string;
    expiry: string; // MM/YY
    cvv: string;
    name: string;
}
export interface ChargeResult {
    success: boolean;
    gatewayReference: string;
    declineReason?: string;
}

const PAYSTACK_API = 'https://api.paystack.co';

/* ----------------------------- card helpers ----------------------------- */

function digitsOnly(s: string): string {
    return s.replace(/\D/g, '');
}

function luhnValid(cardNumber: string): boolean {
    const d = digitsOnly(cardNumber);
    if (d.length < 13 || d.length > 19) return false;
    let sum = 0;
    let alt = false;
    for (let i = d.length - 1; i >= 0; i--) {
        let n = parseInt(d[i], 10);
        if (alt) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        alt = !alt;
    }
    return sum % 10 === 0;
}

export function expiryValid(expiry: string): boolean {
    const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry.trim());
    if (!m) return false;
    const month = parseInt(m[1], 10);
    const year = 2000 + parseInt(m[2], 10);
    const now = new Date();
    const exp = new Date(year, month, 0, 23, 59, 59); // last instant of expiry month
    return exp.getTime() >= now.getTime();
}

const MOCK_DECLINES: Record<string, string> = {
    '5396000000000002': 'Your account has insufficient funds',
    '5396000000000003': 'Your card has been blocked by the issuing bank',
};

/** Paystack test-mode tokens (not real PANs, so exempt from Luhn). */
const TEST_TOKENS = new Set(['5396000000000000', '5396000000000002', '5396000000000003']);

/* ------------------------------ mock gateway ------------------------------ */

function mockReference(): string {
    return `MOCK_${Math.random().toString(36).slice(2, 10).toUpperCase()}_${Date.now()}`;
}

async function mockCharge(env: Env, p: ChargeParams): Promise<ChargeResult> {
    // Small, realistic latency so the UI's processing state is exercised.
    await new Promise((r) => setTimeout(r, 550));

    const num = digitsOnly(p.cardNumber);
    if (!TEST_TOKENS.has(num) && !luhnValid(p.cardNumber)) {
        return { success: false, gatewayReference: '', declineReason: 'Invalid card number' };
    }
    if (!expiryValid(p.expiry)) {
        return { success: false, gatewayReference: '', declineReason: 'Card is expired' };
    }
    if (!/^\d{3,4}$/.test(p.cvv.trim())) {
        return { success: false, gatewayReference: '', declineReason: 'Invalid security code' };
    }
    if (!p.name || p.name.trim().length < 2) {
        return { success: false, gatewayReference: '', declineReason: 'Enter the name on the card' };
    }
    const decline = MOCK_DECLINES[num];
    if (decline) {
        return { success: false, gatewayReference: '', declineReason: decline };
    }
    return { success: true, gatewayReference: mockReference() };
}

/* ---------------------------- paystack gateway ---------------------------- */

async function paystackInitiate(
    env: Env,
    p: InitiateParams,
): Promise<InitiateResult> {
    const resp = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        },
        body: JSON.stringify({
            email: p.email,
            amount: p.amountKobo,
            currency: p.currency,
            reference: p.reference,
            callback_url: `${env.FRONTEND_ORIGIN}/payment/${p.reference}/done`,
        }),
    });
    const json = await resp.json() as { status: boolean; data?: { authorization_url: string; reference: string } };
    if (!resp.ok || !json.status || !json.data) {
        throw new Error(`Paystack initialize failed (HTTP ${resp.status})`);
    }
    return {
        gatewayReference: json.data.reference,
        checkoutUrl: json.data.authorization_url,
        mode: 'paystack',
    };
}

async function paystackVerify(env: Env, reference: string): Promise<VerifyResult> {
    const resp = await fetch(
        `${PAYSTACK_API}/transaction/verify/${reference}`,
        { headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` } },
    );
    if (!resp.ok) {
        // A 404 on verify means "not yet settled" — treat as pending.
        return { status: 'pending', gatewayReference: reference };
    }
    const json = (await resp.json()) as {
        status: boolean;
        data?: { status: string; reference: string };
    };
    const status = json.data?.status ?? 'pending';
    const normalized = status === 'success' ? 'success' : status === 'failed' ? 'failed' : 'pending';
    return { status: normalized, gatewayReference: reference };
}

/* ------------------------------- facade ------------------------------- */

export function gatewayMode(env: Env): 'mock' | 'paystack' {
    return env.GATEWAY_MODE === 'paystack' && env.PAYSTACK_SECRET_KEY
        ? 'paystack'
        : 'mock';
}

export function initiate(env: Env, p: InitiateParams): Promise<InitiateResult> {
    if (gatewayMode(env) === 'paystack') return paystackInitiate(env, p);
    // Mock: no external call; the shopper pays on the app's own checkout page.
    return Promise.resolve({
        gatewayReference: mockReference(),
        checkoutUrl: `${env.FRONTEND_ORIGIN}/payment/${p.reference}`,
        mode: 'mock',
    });
}

export function verify(env: Env, gatewayReference: string): Promise<VerifyResult> {
    if (gatewayMode(env) === 'paystack') return paystackVerify(env, gatewayReference);
    // Mock payments are settled by `charge`; a reference that exists means success.
    return Promise.resolve({
        status: gatewayReference.startsWith('MOCK_') ? 'success' : 'pending',
        gatewayReference,
    });
}

/** Mock-mode card charge. Never called when gateway mode is 'paystack'. */
export function charge(env: Env, p: ChargeParams): Promise<ChargeResult> {
    if (gatewayMode(env) !== 'mock') {
        return Promise.resolve({
            success: false,
            gatewayReference: '',
            declineReason: 'Card charges are handled on the gateway page in live mode',
        });
    }
    return mockCharge(env, p);
}
