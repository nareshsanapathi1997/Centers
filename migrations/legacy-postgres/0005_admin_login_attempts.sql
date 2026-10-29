-- Brute-force protection for admin and super-admin logins.
-- Mirrors student_login_attempts, but keyed by scope instead of center_id
-- because super-admins are not scoped to a center.

CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id SERIAL PRIMARY KEY,
    scope VARCHAR(20) NOT NULL, -- 'admin' | 'super_admin'
    login_key VARCHAR(255) NOT NULL,
    failed_count INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (scope, login_key)
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_locked
    ON admin_login_attempts(scope, login_key, locked_until);
