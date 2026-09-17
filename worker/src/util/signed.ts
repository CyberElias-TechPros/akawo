import type { Env } from '../env';
import { signJwt } from './crypto';

/**
 * Short-lived signed URLs for private R2 media (KYC face images, liveness
 * videos, payment proofs). The token is a JWT carrying the requesting
 * subject's id + role; the media route verifies signature, expiry, and
 * that the subject is the owner (or an admin) of the media.
 */

export async function signedMediaUrl(
    env: Env,
    key: string,
    subject: { id: string; role: string },
    ttlSeconds = 900,
): Promise<string> {
    const token = await signJwt(
        { sub: `${subject.id}:${subject.role}`, role: subject.role, ttlSeconds },
        env.JWT_ACCESS_SECRET,
    );
    return `/api/media/${key}?token=${token}`;
}
