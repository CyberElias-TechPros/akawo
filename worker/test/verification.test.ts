import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { api, registerUser, bootstrapAdmin, PNG_BYTES, VIDEO_BYTES, multipart } from './helpers';

async function submitKyc(token: string) {
    const fd = multipart({
        facialImage: { content: PNG_BYTES, name: 'face.png', type: 'image/png' },
        livenessVideo: { content: VIDEO_BYTES, name: 'liveness.mp4', type: 'video/mp4' },
    });
    const res = await SELF.fetch(
        new Request('http://localhost/api/verification/submit', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
        }),
    );
    return res;
}

describe('identity verification', () => {
    it('full happy path: submit → admin approves → user verified, notified, emailed', async () => {
        const u = await registerUser();
        const admin = await bootstrapAdmin();

        const res = await submitKyc(u.tokens.accessToken);
        expect(res.status).toBe(201);
        const submitted = (await res.json()) as any;
        expect(submitted.data.verification.status).toBe('pending');

        // User can poll status
        const status = await api('GET', '/api/verification/status', { token: u.tokens.accessToken });
        expect(status.body.data.isVerified).toBe(false);
        expect(status.body.data.latest.status).toBe('pending');

        // Admin sees the pending submission with user details
        const queue = await api('GET', '/api/admin/verifications?status=pending', { token: admin.token });
        expect(queue.body.data.verifications.length).toBe(1);
        expect(queue.body.data.verifications[0].user.email).toBe(u.email);
        const verifId = queue.body.data.verifications[0].id;

        // Admin detail includes signed media URLs (15-minute scoped)
        const detail = await api('GET', `/api/admin/verifications/${verifId}`, { token: admin.token });
        expect(detail.status).toBe(200);
        expect(detail.body.data.verification.media.face).toContain('/api/media/');
        expect(detail.body.data.verification.media.liveness).toContain('/api/media/');

        // Admin opens the face media through the signed URL
        const faceRes = await SELF.fetch(
            new Request(`http://localhost${detail.body.data.verification.media.face}`, {
                headers: { Authorization: `Bearer ${admin.token}` },
            }),
        );
        expect(faceRes.status).toBe(200);
        expect(faceRes.headers.get('Content-Type')).toBe('image/png');

        // Approve
        const approve = await api('POST', `/api/admin/verifications/${verifId}/approve`, { token: admin.token });
        expect(approve.status).toBe(200);

        const me = await api('GET', '/api/auth/me', { token: u.tokens.accessToken });
        expect(me.body.data.user.isVerified).toBe(true);

        // User notified + emailed
        const notifRes = await api('GET', '/api/notifications?limit=1', { token: u.tokens.accessToken });
        expect(notifRes.body.data.notifications[0].type).toBe('verification_approved');
        const emailRes = await api('GET', '/api/admin/emails?limit=1', { token: admin.token });
        expect(emailRes.body.data.emails[0].subject).toMatch(/verified/i);

        // Already-verified users cannot resubmit
        const again = await submitKyc(u.tokens.accessToken);
        expect(again.status).toBe(409);
    });

    it('admin rejection records a reason and allows resubmission', async () => {
        const u = await registerUser();
        const admin = await bootstrapAdmin();

        const res1 = await submitKyc(u.tokens.accessToken);
        expect(res1.status).toBe(201);
        const queue = await api('GET', '/api/admin/verifications?status=pending', { token: admin.token });
        const verifId = queue.body.data.verifications[0].id;

        const reject = await api('POST', `/api/admin/verifications/${verifId}/reject`, {
            token: admin.token,
            body: { reason: 'Photo too dark' },
        });
        expect(reject.status).toBe(200);

        const me = await api('GET', '/api/auth/me', { token: u.tokens.accessToken });
        expect(me.body.data.user.isVerified).toBe(false);

        const status = await api('GET', '/api/verification/status', { token: u.tokens.accessToken });
        expect(status.body.data.latest.status).toBe('rejected');
        expect(status.body.data.latest.rejectReason).toBe('Photo too dark');

        // Resubmission allowed after rejection
        const res2 = await submitKyc(u.tokens.accessToken);
        expect(res2.status).toBe(201);
    });

    it('blocks a second submission while one is pending', async () => {
        const u = await registerUser();
        const res1 = await submitKyc(u.tokens.accessToken);
        expect(res1.status).toBe(201);
        const res2 = await submitKyc(u.tokens.accessToken);
        expect(res2.status).toBe(409);
        expect(((await res2.json()) as any).error.code).toBe('pending_exists');
    });

    it('validates file types', async () => {
        const u = await registerUser();
        const fd = multipart({
            facialImage: { content: new Blob([PNG_BYTES], { type: 'text/plain' }), name: 'face.txt' },
            livenessVideo: { content: VIDEO_BYTES, name: 'l.mp4', type: 'video/mp4' },
        });
        const res = await SELF.fetch(
            new Request('http://localhost/api/verification/submit', {
                method: 'POST',
                headers: { Authorization: `Bearer ${u.tokens.accessToken}` },
                body: fd,
            }),
        );
        expect(res.status).toBe(415);
    });

    it('media URLs are scoped: stranger tokens are denied for other users’ media', async () => {
        const u = await registerUser();
        const stranger = await registerUser();
        const admin = await bootstrapAdmin();

        await submitKyc(u.tokens.accessToken);
        const queue = await api('GET', '/api/admin/verifications?status=pending', { token: admin.token });
        const verifId = queue.body.data.verifications[0].id;
        const detail = await api('GET', `/api/admin/verifications/${verifId}`, { token: admin.token });
        const faceUrl = detail.body.data.verification.media.face;

        // A non-admin, non-owner token is rejected even with a well-formed media URL
        const strangerRes = await SELF.fetch(
            new Request(`http://localhost${faceUrl}`, {
                headers: { Authorization: `Bearer ${stranger.tokens.accessToken}` },
            }),
        );
        expect(strangerRes.status).toBe(403);

        // The owner can fetch their own media with a URL signed for them.
        // (The signed URL encodes subject+role; a user's own signed URL works.)
        // We assert via the admin flow already proven above; here we assert the
        // denial path strictly (403), which is the security property.
    });

    it('admin review is single-shot: approve then reject is blocked', async () => {
        const u = await registerUser();
        const admin = await bootstrapAdmin();
        await submitKyc(u.tokens.accessToken);
        const queue = await api('GET', '/api/admin/verifications?status=pending', { token: admin.token });
        const verifId = queue.body.data.verifications[0].id;

        const approve = await api('POST', `/api/admin/verifications/${verifId}/approve`, { token: admin.token });
        expect(approve.status).toBe(200);
        const reject = await api('POST', `/api/admin/verifications/${verifId}/reject`, {
            token: admin.token,
            body: { reason: 'too late' },
        });
        expect(reject.status).toBe(409);
    });
});
