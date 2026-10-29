import pool from './db'

const MAX_FAILURES = Number(process.env.STUDENT_LOGIN_MAX_FAILURES || 5)
const LOCKOUT_MINUTES = Number(process.env.STUDENT_LOGIN_LOCKOUT_MINUTES || 15)

function normalizeLoginKey(login: string): string {
  const trimmed = login.trim()
  if (trimmed.includes('@')) return trimmed.toLowerCase()
  const digits = trimmed.replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

export async function isLoginLocked(
  centerId: number,
  login: string
): Promise<{ locked: boolean; retryAfterMinutes?: number }> {
  const loginKey = normalizeLoginKey(login)
  const result = await pool.query(
    `SELECT locked_until FROM student_login_attempts
     WHERE center_id = $1 AND login_key = $2`,
    [centerId, loginKey]
  )
  const row = result.rows[0]
  if (!row?.locked_until) return { locked: false }

  const lockedUntil = new Date(row.locked_until)
  if (lockedUntil <= new Date()) {
    await pool.query(
      `UPDATE student_login_attempts SET failed_count = 0, locked_until = NULL
       WHERE center_id = $1 AND login_key = $2`,
      [centerId, loginKey]
    )
    return { locked: false }
  }

  const retryAfterMinutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000)
  return { locked: true, retryAfterMinutes }
}

export async function recordFailedLogin(centerId: number, login: string): Promise<void> {
  const loginKey = normalizeLoginKey(login)
  const result = await pool.query(
    `INSERT INTO student_login_attempts (center_id, login_key, failed_count, last_attempt_at)
     VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
     ON CONFLICT (center_id, login_key) DO UPDATE SET
       -- MySQL applies assignments in order: read failed_count before bumping it.
       locked_until = CASE
         WHEN student_login_attempts.failed_count + 1 >= $3
         THEN DATE_ADD(CURRENT_TIMESTAMP, INTERVAL $4 MINUTE)
         ELSE student_login_attempts.locked_until
       END,
       failed_count = student_login_attempts.failed_count + 1,
       last_attempt_at = CURRENT_TIMESTAMP
     RETURNING failed_count`,
    [centerId, loginKey, MAX_FAILURES, LOCKOUT_MINUTES]
  )
  void result
}

export async function clearLoginAttempts(centerId: number, login: string): Promise<void> {
  const loginKey = normalizeLoginKey(login)
  await pool.query(
    `DELETE FROM student_login_attempts WHERE center_id = $1 AND login_key = $2`,
    [centerId, loginKey]
  )
}
