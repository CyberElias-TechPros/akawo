import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { ApiError } from '../util/http';
import { verifyJwt } from '../util/crypto';
import { requireUser, userOf } from '../auth';

const app = new Hono<AppEnv>();

/**
 * Serve private R2 media (proofs, KYC submissions) to the owner or an admin
 * via a short-lived signed token (see util/signed.ts).
 *
 * The R2 object's customMetadata records the owner user id, which is how
 * ownership is enforced here.
 */
app.get('/*', requireUser, async (c) => {
    const token = c.req.query('token');
    if (!token) throw ApiError.unauthorized('Signed token required');

    const payload = await verifyJwt(token, c.env.JWT_ACCESS_SECRET);
    if (!payload) throw ApiError.unauthorized('Token expired or invalid');

    // subject is encoded as "<userId>:<role>"
    const [subjectId, subjectRole] = String(payload.sub).split(':');
    const isSubjectAdmin = subjectRole === 'admin';

    // The URL was issued to a specific subject — only that subject may use it.
    const user = userOf(c);
    if (subjectId !== user.id || isSubjectAdmin !== (user.role === 'admin')) {
        throw ApiError.forbidden('This media URL was not issued for you');
    }

    const key = c.req.path.replace(/^\/api\/media\//, '').replace(/^\/+/, '');
    if (!key || key.includes('..')) throw ApiError.badRequest('Invalid key');

    const obj = await c.env.BUCKET.head(key);
    if (!obj) throw ApiError.notFound('Media not found');

    const owner = (obj.customMetadata?.owner as string | undefined) ?? '';
    const isOwner = subjectId === owner;
    if (!isOwner && !isSubjectAdmin) throw ApiError.forbidden();

    // Admins may only open media they are authorized for: any (admin role
    // itself is the authorization boundary — enforced by requireUser).
    const body = await c.env.BUCKET.get(key);
    if (!body) throw ApiError.notFound('Media not found');
    const stream = body as unknown as ReadableStream;

    const contentType = obj.httpMetadata?.contentType || 'application/octet-stream';
    return new Response(stream, {
        headers: {
            'Content-Type': contentType,
            'Content-Length': String(obj.size),
            'Cache-Control': 'private, max-age=60',
            'Content-Disposition': `inline; filename="${key.split('/').pop()}"`,
        },
    });
});

export default app;
