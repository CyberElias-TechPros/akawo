import type { Env } from '../env';
import { randomId } from '../util/crypto';
import { nowIso } from '../util/format';
import { run } from '../db';

/** In-app notification for a user (shown in the bell + notifications page). */
export async function notify(
    env: Env,
    userId: string,
    type: string,
    title: string,
    body?: string,
): Promise<void> {
    await run(
        env.DB,
        `INSERT INTO notifications (id, user_id, type, title, body, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        randomId(),
        userId,
        type,
        title,
        body ?? null,
        nowIso(),
    );
}

/** Append to the audit trail (admins can view; no secrets in meta). */
export async function audit(
    env: Env,
    actorId: string | null,
    action: string,
    entity?: string,
    entityId?: string,
    meta?: Record<string, unknown>,
): Promise<void> {
    await run(
        env.DB,
        `INSERT INTO audit_logs (id, actor_id, action, entity, entity_id, meta, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        randomId(),
        actorId,
        action,
        entity ?? null,
        entityId ?? null,
        meta ? JSON.stringify(meta) : null,
        nowIso(),
    );
}
