import type { D1Database } from '@cloudflare/workers-types';

/** Typed thin wrappers over D1 prepared statements. */
export interface Db {
    db: D1Database;
}

export const d1 = (db: D1Database): Db => ({ db });

export async function all<T = Record<string, unknown>>(
    db: D1Database,
    sql: string,
    ...params: unknown[]
): Promise<T[]> {
    const res = await db.prepare(sql).bind(...params).all<T>();
    return res.results as T[];
}

export async function first<T = Record<string, unknown> | null>(
    db: D1Database,
    sql: string,
    ...params: unknown[]
): Promise<T> {
    const res = await db.prepare(sql).bind(...params).first<T>();
    return (res ?? null) as T;
}

export async function run(
    db: D1Database,
    sql: string,
    ...params: unknown[]
): Promise<{ meta: D1Meta }> {
    return db.prepare(sql).bind(...params).run();
}

/**
 * Run statements in a single D1 transaction (all-or-nothing).
 * Use for multi-write flows (e.g. payment completion → contribution update).
 */
export async function tx(
    db: D1Database,
    statements: Array<{ sql: string; params: unknown[] }>,
): Promise<void> {
    const bound = statements.map((s) => db.prepare(s.sql).bind(...s.params));
    await db.batch(bound);
}
