// Paystack payment gateway integration (works on Cloudflare Workers via fetch).

const DEFAULT_BASE = 'https://api.paystack.co';

export function paystackBase(env) {
  return env.PAYSTACK_BASE_URL || DEFAULT_BASE;
}

function authHeader(env) {
  if (!env.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY is not configured');
  return { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' };
}

// Initialize a transaction. Returns Paystack's response payload containing
// the `authorization_url` the user should be redirected to.
export async function initializeTransaction(env, { email, amount, reference, metadata }) {
  const res = await fetch(`${paystackBase(env)}/transaction/initialize`, {
    method: 'POST',
    headers: authHeader(env),
    body: JSON.stringify({
      email,
      amount: Math.round(amount * 100), // kobo
      currency: 'NGN',
      reference,
      metadata,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || 'Failed to initialize payment');
  }
  return data.data;
}

// Verify a transaction by reference.
export async function verifyTransaction(env, reference) {
  const res = await fetch(`${paystackBase(env)}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: authHeader(env),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to verify payment');
  return data.data;
}

// Verify the signature of an incoming Paystack webhook.
export async function verifyWebhookSignature(env, rawBody, signatureHeader) {
  if (!env.PAYSTACK_SECRET_KEY) return false;
  if (!signatureHeader) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.PAYSTACK_SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const expected = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return expected === signatureHeader.toLowerCase();
}
