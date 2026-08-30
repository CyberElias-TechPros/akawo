// D1 database access layer. Ensures the schema exists (idempotent) so the
// Worker works out of the box with `wrangler dev`, and exposes small helpers
// for queries.

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    bvn           TEXT NOT NULL UNIQUE,
    phone         TEXT,
    role          TEXT NOT NULL DEFAULT 'user',
    is_verified   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS contributions (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount           REAL NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending',
    payment_due_date TEXT,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS payments (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contribution_id TEXT REFERENCES contributions(id) ON DELETE SET NULL,
    amount        REAL NOT NULL,
    reference     TEXT,
    proof_url     TEXT,
    status        TEXT NOT NULL DEFAULT 'pending',
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS verifications (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    facial_image    TEXT,
    liveness_video  TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_contributions_user ON contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON verifications(user_id);
`;

let schemaReady = false;

export async function initSchema(db) {
  if (schemaReady) return;
  // Execute each DDL statement individually — the local D1 emulator does not
  // reliably accept multi-statement `exec` payloads.
  const statements = SCHEMA.split(';').map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await db.prepare(statement).run();
  }
  schemaReady = true;
}

export async function first(db, sql, ...params) {
  return db.prepare(sql).bind(...params).first();
}

export async function all(db, sql, ...params) {
  const result = await db.prepare(sql).bind(...params).all();
  return result.results || [];
}

export async function run(db, sql, ...params) {
  return db.prepare(sql).bind(...params).run();
}
