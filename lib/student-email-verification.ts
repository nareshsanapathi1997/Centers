import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import pool from './db'
import { sendEmail } from './email'
import { withBasePath } from './with-base-path'

const TOKEN_TTL_HOURS = 48

export async function createEmailVerificationToken(studentId: number): Promise<string | null> {
  const student = await pool.query(
    'SELECT id, email, full_name, center_id, email_verified FROM students WHERE id = $1',
    [studentId]
  )
  const row = student.rows[0]
  if (!row?.email?.trim() || row.email_verified) return null

  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = await bcrypt.hash(token, 8)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + TOKEN_TTL_HOURS)

  await pool.query('DELETE FROM student_email_verification_tokens WHERE student_id = $1 AND used_at IS NULL', [
    studentId,
  ])
  await pool.query(
    `INSERT INTO student_email_verification_tokens (student_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [studentId, tokenHash, expiresAt]
  )

  const center = await pool.query('SELECT slug, name FROM centers WHERE id = $1', [row.center_id])
  const slug = center.rows[0]?.slug || ''
  const origin = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3600').replace(/\/+$/, '')
  const verifyPath = withBasePath(`/${slug}/student/verify-email?token=${token}&studentId=${studentId}`)
  const verifyUrl = `${origin}${verifyPath}`

  await sendEmail({
    to: row.email.trim(),
    subject: `Verify your email — ${center.rows[0]?.name || 'Student Portal'}`,
    html: `<p>Hello ${row.full_name},</p><p>Please verify your email:</p><p><a href="${verifyUrl}">Verify Email</a></p><p>This link expires in ${TOKEN_TTL_HOURS} hours.</p>`,
  })

  return token
}

export async function verifyEmailToken(
  studentId: number,
  token: string
): Promise<{ valid: boolean; error?: string }> {
  const result = await pool.query(
    `SELECT * FROM student_email_verification_tokens
     WHERE student_id = $1 AND used_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [studentId]
  )
  if (result.rows.length === 0) {
    return { valid: false, error: 'Verification link expired or invalid' }
  }
  const row = result.rows[0]
  if (new Date() > new Date(row.expires_at)) {
    return { valid: false, error: 'Verification link has expired' }
  }
  const match = await bcrypt.compare(token, row.token_hash)
  if (!match) {
    return { valid: false, error: 'Invalid verification link' }
  }
  await pool.query('UPDATE student_email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [row.id])
  await pool.query(
    'UPDATE students SET email_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [studentId]
  )
  return { valid: true }
}
