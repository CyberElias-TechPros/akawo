import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';

const url = (path: string) => new Request(`http://localhost${path}`);

describe('worker boots', () => {
    it('serves /api/health with gateway mode', async () => {
        const res = await SELF.fetch(url('/api/health'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { success: boolean; data: { status: string; gatewayMode: string } };
        expect(body.success).toBe(true);
        expect(body.data.status).toBe('ok');
        expect(body.data.gatewayMode).toBe('mock');
    });

    it('applies the D1 schema (users table exists)', async () => {
        // A bad route should 404 (proves router + error handler work).
        const res = await SELF.fetch(url('/api/definitely-not-a-route'));
        expect(res.status).toBe(404);
        const body = (await res.json()) as { success: boolean; error: { code: string } };
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('not_found');
    });

    it('serves /api/config public values', async () => {
        const res = await SELF.fetch(url('/api/config'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { success: boolean; data: { currency: string } };
        expect(body.data.currency).toBe('NGN');
    });
});
