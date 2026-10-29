import pool from './db'

const MAX_FAILURES = Number(process.env.ADMIN_LOGIN_MAX_FAILURES || 5)
const LOCKOUT_MINUTES = Number(process.env.ADMIN_LOGIN_LOCKOUT_MINUTES || 15)

export type AdminLoginScope = 'admin' | 'super_admin'

function normalizeLoginKey(login: string): string {
  return login.trim().toLowerCase()
}

/**
 * Per-account lockout for admin and super-admin logins. IP rate limiting alone
 * does not stop a distributed attack against one known username, so failures
 * are also counted per account.
 *
 * Lockout failures are non-fatal by design: if the attempts table is missing or
 * unreachable, logins must keep working rather than lock everyone out.
 */
export async function isAdminLoginLocked(
  scope: AdminLoginScope,
  login: string
): Promise<{ locked: boolean; retryAfterMinutes?: number }> {
  const loginKey = normalizeLoginKey(login)
  try {
    const result = await pool.query(
      `SELECT locked_until FROM admin_login_attempts WHERE scope = $1 AND login_key = $2`,
      [scope, loginKey]
    )
    const row = result.rows[0]
    if (!row?.locked_until) return { locked: false }

    const lockedUntil = new Date(row.locked_until)
    if (lockedUntil <= new Date()) {
      await pool.query(
        `UPDATE admin_login_attempts SET failed_count = 0, locked_until = NULL
         WHERE scope = $1 AND login_key = $2`,
        [scope, loginKey]
      )
      return { locked: false }
    }

    return {
      locked: true,
      retryAfterMinutes: Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000),
    }
  } catch (error) {
    console.error('[admin-lockout] check failed:', error)
    return { locked: false }
  }
}

export async function recordFailedAdminLogin(
  scope: AdminLoginScope,
  login: string
): Promise<void> {
  const loginKey = normalizeLoginKey(login)
  try {
    await pool.query(
      `INSERT INTO admin_login_attempts (scope, login_key, failed_count, last_attempt_at)
       VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
       ON CONFLICT (scope, login_key) DO UPDATE SET
         -- MySQL applies assignments in order: read failed_count before bumping it.
         locked_until = CASE
           WHEN admin_login_attempts.failed_count + 1 >= $3
           THEN DATE_ADD(CURRENT_TIMESTAMP, INTERVAL $4 MINUTE)
           ELSE admin_login_attempts.locked_until
         END,
         failed_count = admin_login_attempts.failed_count + 1,
         last_attempt_at = CURRENT_TIMESTAMP`,
      [scope, loginKey, MAX_FAILURES, LOCKOUT_MINUTES]
    )
  } catch (error) {
    console.error('[admin-lockout] record failed:', error)
  }
}

export async function clearAdminLoginAttempts(
  scope: AdminLoginScope,
  login: string
): Promise<void> {
  try {
    await pool.query(
      `DELETE FROM admin_login_attempts WHERE scope = $1 AND login_key = $2`,
      [scope, normalizeLoginKey(login)]
    )
  } catch (error) {
    console.error('[admin-lockout] clear failed:', error)
  }
}
