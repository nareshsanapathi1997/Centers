-- Admin/super-admin revocable sessions + force password change on first login

CREATE TABLE IF NOT EXISTS admin_sessions (
  id SERIAL PRIMARY KEY,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('admin', 'super_admin')),
  user_id INTEGER NOT NULL,
  center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
  token_jti VARCHAR(64) NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address VARCHAR(64),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user
  ON admin_sessions (user_type, user_id);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_jti_active
  ON admin_sessions (token_jti)
  WHERE revoked_at IS NULL;

ALTER TABLE center_admins
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE super_admins
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
