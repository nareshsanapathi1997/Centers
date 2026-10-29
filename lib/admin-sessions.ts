import crypto from 'crypto'
import pool from './db'

export type AdminSessionUserType = 'admin' | 'super_admin'

export function generateAdminTokenJti(): string {
  return crypto.randomBytes(16).toString('hex')
}

export async function createAdminSession(input: {
  userType: AdminSessionUserType
  userId: number
  centerId?: number | null
  tokenJti: string
  expiresAt: Date
  userAgent?: string | null
  ipAddress?: string | null
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO admin_sessions
         (user_type, user_id, center_id, token_jti, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.userType,
        input.userId,
        input.centerId ?? null,
        input.tokenJti,
        input.userAgent || null,
        input.ipAddress || null,
        input.expiresAt,
      ]
    )
  } catch (error: unknown) {
    const code = (error as { code?: string } | null)?.code
    if (code === '42P01') {
      console.warn('[admin-sessions] table missing; run npm run db:migrate')
      return
    }
    throw error
  }
}

export async function isAdminSessionValid(tokenJti: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT id FROM admin_sessions
       WHERE token_jti = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
      [tokenJti]
    )
    return result.rows.length > 0
  } catch (error: unknown) {
    const code = (error as { code?: string } | null)?.code
    if (code === '42P01') {
      console.warn('[admin-sessions] table missing; run npm run db:migrate')
      return true
    }
    throw error
  }
}

export async function revokeAdminSession(tokenJti: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP
     WHERE token_jti = $1 AND revoked_at IS NULL`,
    [tokenJti]
  )
  return (result.rowCount ?? 0) > 0
}

export async function revokeAllAdminSessions(
  userType: AdminSessionUserType,
  userId: number,
  exceptJti?: string
): Promise<void> {
  if (exceptJti) {
    await pool.query(
      `UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP
       WHERE user_type = $1 AND user_id = $2 AND revoked_at IS NULL AND token_jti <> $3`,
      [userType, userId, exceptJti]
    )
  } else {
    await pool.query(
      `UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP
       WHERE user_type = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [userType, userId]
    )
  }
}
