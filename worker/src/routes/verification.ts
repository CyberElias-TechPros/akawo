import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppEnv } from '../types';
import { first, all, run } from '../db';
import { randomId } from '../util/crypto';
import { ApiError } from '../util/http';
import { nowIso } from '../util/format';
import { requireUser, userOf } from '../auth';
import { audit, notify } from '../services/notify';
import { runFaceCheck, runLivenessCheck } from '../services/identity';
import { signedMediaUrl } from '../util/signed';

const app = new Hono<AppEnv>();

interface VerificationRow {
    id: string;
    user_id: string;
    face_key: string;
    liveness_key: string;
    face_meta: string | null;
    liveness_meta: string | null;
    status: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
    reject_reason: string | null;
    created_at: string;
    updated_at: string;
    name?: string | null;
    email?: string | null;
}

const FACE_TYPES: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
};
const VIDEO_TYPES: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
};
const FACE_MAX = 5 * 1024 * 1024;
const VIDEO_MAX = 50 * 1024 * 1024;

const serialize = (v: VerificationRow, withUser = false) => ({
    id: v.id,
    status: v.status,
    faceMeta: v.face_meta ? JSON.parse(v.face_meta) : null,
    livenessMeta: v.liveness_meta ? JSON.parse(v.liveness_meta) : null,
    rejectReason: v.reject_reason,
    reviewedAt: v.reviewed_at,
    createdAt: v.created_at,
    updatedAt: v.updated_at,
    ...(withUser ? { name: v.name, email: v.email } : {}),
});

async function takeFile(
    c: Context<AppEnv>,
    form: FormData,
    field: string,
    types: Record<string, string>,
    maxBytes: number,
    label: string,
): Promise<{ blob: Blob; ext: string }> {
    const file = form.get(field);
    if (!file || typeof file === 'string') throw ApiError.badRequest(`${label} is required (field: ${field})`);
    const blob = file as Blob;
    if (blob.size > maxBytes) throw new ApiError(413, `${label} must be ${Math.round(maxBytes / 1024 / 1024)}MB or smaller`);
    const ext = types[blob.type];
    if (!ext) {
        throw new ApiError(415, `Unsupported ${label.toLowerCase()} type. Accepts: ${Object.keys(types).join(', ')}`);
    }
    return { blob, ext };
}

/* --------------------------------- submit --------------------------------- */

app.post('/submit', requireUser, async (c) => {
    const user = userOf(c);
    if (user.is_verified) throw ApiError.conflict('Your identity is already verified', 'already_verified');

    const pending = await first(
        c.env.DB,
        `SELECT id FROM verifications WHERE user_id = ? AND status = 'pending'`,
        user.id,
    );
    if (pending) {
        throw ApiError.conflict('A verification is already under review. Please wait for the outcome', 'pending_exists');
    }

    const contentType = c.req.header('Content-Type') || '';
    if (!contentType.startsWith('multipart/form-data')) {
        throw ApiError.badRequest('Submission must be multipart/form-data with facialImage and livenessVideo fields');
    }
    const form = await c.req.formData().catch(() => null);
    if (!form) throw ApiError.badRequest('Invalid form data');

    const face = await takeFile(c, form, 'facialImage', FACE_TYPES, FACE_MAX, 'Facial image');
    const video = await takeFile(c, form, 'livenessVideo', VIDEO_TYPES, VIDEO_MAX, 'Liveness video');

    const id = randomId();
    const faceKey = `verifications/${user.id}/${id}/face.${face.ext}`;
    const videoKey = `verifications/${user.id}/${id}/liveness.${video.ext}`;
    const faceBytes = new Uint8Array(await face.blob.arrayBuffer());
    const videoBytes = new Uint8Array(await video.blob.arrayBuffer());
    await c.env.BUCKET.put(faceKey, faceBytes, {
        httpMetadata: { contentType: face.blob.type },
        customMetadata: { owner: user.id, kind: 'face' },
    });
    await c.env.BUCKET.put(videoKey, videoBytes, {
        httpMetadata: { contentType: video.blob.type },
        customMetadata: { owner: user.id, kind: 'liveness' },
    });

    // Face/liveness pre-check (only when an external provider is configured).
    const faceMeta = await runFaceCheck(c.env, faceKey);
    const livenessMeta = await runLivenessCheck(c.env, videoKey);
    const now = nowIso();

    await run(
        c.env.DB,
        `INSERT INTO verifications (id, user_id, face_key, liveness_key, face_meta, liveness_meta,
                                    status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        id,
        user.id,
        faceKey,
        videoKey,
        faceMeta ? JSON.stringify(faceMeta) : null,
        livenessMeta ? JSON.stringify(livenessMeta) : null,
        now,
        now,
    );

    await audit(c.env, user.id, 'verification.submitted', 'verification', id);
    await notify(
        c.env,
        user.id,
        'verification_submitted',
        'Identity verification submitted',
        'Your documents are being reviewed. You will be notified once the review is complete.',
    );

    return c.json({ success: true, data: { verification: { id, status: 'pending' } } }, 201);
});

/* --------------------------------- status --------------------------------- */

app.get('/status', requireUser, async (c) => {
    const user = userOf(c);
    const latest = (await first<VerificationRow>(
        c.env.DB,
        `SELECT * FROM verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
        user.id,
    )) ?? null;
    let media: { face: string; liveness: string } | null = null;
    if (latest) {
        const subject = { id: user.id, role: 'user' as const };
        media = {
            face: await signedMediaUrl(c.env, latest.face_key, subject),
            liveness: await signedMediaUrl(c.env, latest.liveness_key, subject),
        };
    }
    return c.json({
        success: true,
        data: {
            isVerified: !!user.is_verified,
            latest: latest ? { ...serialize(latest), media } : null,
        },
    });
});

/* --------------------------------- history -------------------------------- */

app.get('/history', requireUser, async (c) => {
    const user = userOf(c);
    const rows = await all<VerificationRow>(
        c.env.DB,
        `SELECT * FROM verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
        user.id,
    );
    return c.json({ success: true, data: { verifications: rows.map((v) => serialize(v)) } });
});

export default app;
