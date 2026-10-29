import crypto from 'crypto'
import pool from './db'

export function generateTokenJti(): string {
  return crypto.randomBytes(16).toString('hex')
}

export async function createStudentSession(input: {
  studentId: number
  centerId: number
  tokenJti: string
  expiresAt: Date
  userAgent?: string | null
  ipAddress?: string | null
}): Promise<void> {
  await pool.query(
    `INSERT INTO student_sessions (student_id, center_id, token_jti, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.studentId,
      input.centerId,
      input.tokenJti,
      input.userAgent || null,
      input.ipAddress || null,
      input.expiresAt,
    ]
  )
}

export async function isStudentSessionValid(tokenJti: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM student_sessions
     WHERE token_jti = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [tokenJti]
  )
  return result.rows.length > 0
}

/**
 * Revoke one session. Pass `studentId` to scope the update to that student —
 * callers acting on a jti from user input must always do so, otherwise a
 * student can revoke someone else's session.
 *
 * Returns whether a row was actually revoked.
 */
export async function revokeStudentSession(
  tokenJti: string,
  studentId?: number
): Promise<boolean> {
  const result =
    studentId === undefined
      ? await pool.query(
          `UPDATE student_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_jti = $1`,
          [tokenJti]
        )
      : await pool.query(
          `UPDATE student_sessions SET revoked_at = CURRENT_TIMESTAMP
           WHERE token_jti = $1 AND student_id = $2`,
          [tokenJti, studentId]
        )
  return (result.rowCount ?? 0) > 0
}

export async function revokeAllStudentSessions(
  studentId: number,
  exceptJti?: string
): Promise<void> {
  if (exceptJti) {
    await pool.query(
      `UPDATE student_sessions SET revoked_at = CURRENT_TIMESTAMP
       WHERE student_id = $1 AND revoked_at IS NULL AND token_jti <> $2`,
      [studentId, exceptJti]
    )
  } else {
    await pool.query(
      `UPDATE student_sessions SET revoked_at = CURRENT_TIMESTAMP
       WHERE student_id = $1 AND revoked_at IS NULL`,
      [studentId]
    )
  }
}

export async function listStudentSessions(studentId: number) {
  const result = await pool.query(
    `SELECT id, token_jti, user_agent, ip_address, created_at, expires_at, revoked_at
     FROM student_sessions
     WHERE student_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [studentId]
  )
  return result.rows
}
