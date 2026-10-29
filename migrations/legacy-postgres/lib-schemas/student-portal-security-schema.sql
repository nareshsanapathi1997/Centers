-- Student portal security extensions

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key VARCHAR(255) PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_reset ON rate_limit_buckets(reset_at);

CREATE TABLE IF NOT EXISTS student_login_attempts (
  id SERIAL PRIMARY KEY,
  center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  login_key VARCHAR(255) NOT NULL,
  failed_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP,
  last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(center_id, login_key)
);

CREATE TABLE IF NOT EXISTS student_sessions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  token_jti VARCHAR(64) NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_sessions_student ON student_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_jti ON student_sessions(token_jti);

CREATE TABLE IF NOT EXISTS student_email_verification_tokens (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_email_verify_student ON student_email_verification_tokens(student_id);

CREATE TABLE IF NOT EXISTS student_guardians (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  center_id INTEGER NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  relation VARCHAR(100),
  mobile VARCHAR(50),
  email VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_guardians_student ON student_guardians(student_id);
