import type { Env } from '../env';

/**
 * Identity verification (KYC) service.
 *
 * Two modes selected by env.FACE_MODE:
 *
 *  - 'manual' (default): the uploaded face image + liveness video are stored
 *    in R2 and the verification stays `pending` until an admin reviews and
 *    approves/rejects it in the admin console. This is a real, common KYC
 *    workflow (manual review) and keeps the happy path fully functional with
 *    no external credentials.
 *
 *  - 'api': when FACE_API_* / LIVENESS_API_* are configured, the media is sent
 *    to the external providers and their verdicts are stored. The submission
 *    is still reviewed/approved by an admin (a machine score informs but does
 *    not replace the decision), so both modes converge on the same state
 *    machine: pending → approved | rejected.
 */

export interface FaceMeta {
    provider: string;
    score?: number;
    matched?: boolean;
    raw?: unknown;
}

export interface LivenessMeta {
    provider: string;
    score?: number;
    passed?: boolean;
    raw?: unknown;
}

async function callProvider(
    env: Env,
    url: string | undefined,
    key: string | undefined,
    payload: Record<string, unknown>,
): Promise<unknown> {
    if (!url || !key) throw new Error('Provider not configured');
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': key,
        },
        body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`Provider HTTP ${resp.status}`);
    return await resp.json();
}

/** Runs the face check. Returns null in manual mode (nothing to compute). */
export async function runFaceCheck(
    env: Env,
    faceUrl: string,
): Promise<FaceMeta | null> {
    if (env.FACE_MODE !== 'api') return null;
    try {
        const raw = await callProvider(env, env.FACE_API_URL, env.FACE_API_KEY, {
            image_url: faceUrl,
        });
        const r = (raw ?? {}) as Record<string, unknown>;
        return {
            provider: 'api',
            score: typeof r.score === 'number' ? r.score : undefined,
            matched: typeof r.matched === 'boolean' ? r.matched : undefined,
            raw: r,
        };
    } catch (err) {
        // A provider outage must not block the manual review flow.
        console.error(`[identity] face check failed: ${(err as Error).message}`);
        return { provider: 'api', raw: { error: (err as Error).message } };
    }
}

/** Runs the liveness check. Returns null in manual mode. */
export async function runLivenessCheck(
    env: Env,
    videoUrl: string,
): Promise<LivenessMeta | null> {
    if (env.FACE_MODE !== 'api') return null;
    try {
        const raw = await callProvider(
            env,
            env.LIVENESS_API_URL,
            env.LIVENESS_API_KEY,
            { video_url: videoUrl },
        );
        const r = (raw ?? {}) as Record<string, unknown>;
        return {
            provider: 'api',
            score: typeof r.score === 'number' ? r.score : undefined,
            passed: typeof r.passed === 'boolean' ? r.passed : undefined,
            raw: r,
        };
    } catch (err) {
        console.error(`[identity] liveness check failed: ${(err as Error).message}`);
        return { provider: 'api', raw: { error: (err as Error).message } };
    }
}
