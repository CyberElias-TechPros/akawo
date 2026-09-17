-- Akawo Platform — initial schema
-- D1 (SQLite). All monetary amounts stored as integer kobo (smallest NGN unit).

CREATE TABLE IF NOT EXISTS users (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    email             TEXT NOT NULL UNIQUE,
    phone             TEXT,
    password_hash     TEXT NOT NULL,
    bvn_hash          TEXT NOT NULL UNIQUE,
    bvn_last4         TEXT NOT NULL,
    email_verified    INTEGER NOT NULL DEFAULT 0,
    is_verified       INTEGER NOT NULL DEFAULT 0,   -- KYC / identity verified
    role              TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL,
    last_login_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_bvn ON users (bvn_hash);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              TEXT PRIMARY KEY,               -- jti (random)
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    family_id       TEXT NOT NULL,
    expires_at      INTEGER NOT NULL,               -- epoch ms
    created_at      INTEGER NOT NULL,
    revoked_at      INTEGER,
    replaced_by     TEXT
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_family ON refresh_tokens (family_id);

CREATE TABLE IF NOT EXISTS email_verifications (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    expires_at      INTEGER NOT NULL,
    used_at         INTEGER,
    created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_emailver_user ON email_verifications (user_id);

CREATE TABLE IF NOT EXISTS password_resets (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    expires_at      INTEGER NOT NULL,
    used_at         INTEGER,
    created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pwreset_user ON password_resets (user_id);

CREATE TABLE IF NOT EXISTS contributions (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_kobo     INTEGER NOT NULL CHECK (amount_kobo > 0),
    label           TEXT,
    frequency       TEXT NOT NULL DEFAULT 'once' CHECK (frequency IN ('once','monthly')),
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','failed','cancelled')),
    due_date        TEXT,                            -- ISO date (yyyy-mm-dd)
    paid_at         TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contrib_user ON contributions (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_contrib_status ON contributions (status);

CREATE TABLE IF NOT EXISTS payments (
    id                    TEXT PRIMARY KEY,
    contribution_id       TEXT NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
    user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_kobo           INTEGER NOT NULL CHECK (amount_kobo > 0),
    currency              TEXT NOT NULL DEFAULT 'NGN',
    gateway               TEXT NOT NULL DEFAULT 'mock',
    gateway_reference     TEXT UNIQUE,
    status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','completed','failed','refunded','pending_verification')),
    proof_key             TEXT,
    proof_status          TEXT CHECK (proof_status IN ('unreviewed','approved','rejected')),
    proof_note            TEXT,
    failure_reason        TEXT,
    completed_at          TEXT,
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pay_user ON payments (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pay_contrib ON payments (contribution_id);
CREATE INDEX IF NOT EXISTS idx_pay_ref ON payments (gateway_reference);
CREATE INDEX IF NOT EXISTS idx_pay_status ON payments (status);

CREATE TABLE IF NOT EXISTS verifications (
    id                TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    face_key          TEXT NOT NULL,
    liveness_key      TEXT NOT NULL,
    face_meta         TEXT,                          -- JSON result of face check (or null in manual mode)
    liveness_meta     TEXT,
    status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected')),
    reviewed_by       TEXT REFERENCES users(id),
    reviewed_at       TEXT,
    reject_reason     TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_verif_user ON verifications (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_verif_status ON verifications (status);

CREATE TABLE IF NOT EXISTS notifications (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT,
    read_at         TEXT,
    created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications (user_id, created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
    id              TEXT PRIMARY KEY,
    actor_id        TEXT,
    action          TEXT NOT NULL,
    entity          TEXT,
    entity_id       TEXT,
    meta            TEXT,
    created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at);

CREATE TABLE IF NOT EXISTS emails (
    id              TEXT PRIMARY KEY,
    to_email        TEXT NOT NULL,
    user_id         TEXT,
    subject         TEXT NOT NULL,
    body            TEXT NOT NULL,
    channel         TEXT NOT NULL DEFAULT 'outbox',
    sent_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_to ON emails (to_email);
