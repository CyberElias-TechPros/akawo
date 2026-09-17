/**
 * Schema bootstrap — single source of truth is migrations/*.sql (the same
 * files `wrangler d1 execute` runs in CI).
 *
 * The worker applies any pending migration idempotently, once per isolate.
 * This makes every environment (tests, `wrangler dev`, production) come up
 * self-sufficient while remaining safe: all DDL is `IF NOT EXISTS` and the
 * `_migrations` ledger prevents re-running. Production deploys may still run
 * `wrangler d1 execute` explicitly — the bootstrap is a no-op then.
 */
import initSql from '../../migrations/0001_init.sql';

// Append future migrations here (and to the migrations/ directory):
// import migrate2 from '../../migrations/0002_xxx.sql';
const MIGRATIONS: Array<{ version: number; sql: string }> = [
    { version: 1, sql: initSql },
];

let schemaPromise: Promise<void> | null = null;

/** Split a migration script into executable statements (no semicolons in literals). */
function statementsOf(script: string): string[] {
    return script
        .split(';')
        .map((s) => s.trim())
        .filter((s) => {
            if (!s) return false;
            // Drop fragments that are only comments/whitespace
            return s.split('\n').some((line) => line.trim() !== '' && !line.trim().startsWith('--'));
        });
}

export function ensureSchema(db: D1Database): Promise<void> {
    if (!schemaPromise) {
        schemaPromise = (async () => {
            await db
                .prepare(
                    `CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`,
                )
                .run();

            const appliedRows = (
                await db.prepare(`SELECT version FROM _migrations`).all()
            ).results as Array<{ version: number }>;
            const applied = new Set(appliedRows.map((r) => r.version));

            for (const m of MIGRATIONS) {
                if (applied.has(m.version)) continue;
                for (const stmt of statementsOf(m.sql)) {
                    await db.prepare(stmt).run();
                }
                await db
                    .prepare(`INSERT INTO _migrations (version, applied_at) VALUES (?, ?)`)
                    .bind(m.version, new Date().toISOString())
                    .run();
            }
        })();
    }
    return schemaPromise;
}
