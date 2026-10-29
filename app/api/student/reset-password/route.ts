import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { validatePassword } from '@/lib/password-policy'
import { enforceRateLimit } from '@/lib/payment-rate-limit'
import { revokeAllStudentSessions } from '@/lib/student-sessions'
import { hashResetToken } from '@/lib/password-reset'
import { parseBody } from '@/lib/api-validation'
import { badRequest, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const ResetBody = z.object({
  token: z.string().trim().min(1, 'Reset token is required').max(200),
  password: z.string().min(1, 'Password is required').max(200),
})

export async function POST(request: NextRequest) {
  try {
    const rate = await enforceRateLimit(request, 'student-reset-password', 10, 60_000)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const parsed = await parseBody(request, ResetBody)
    if (!parsed.ok) return parsed.response
    const { token, password } = parsed.data

    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) {
      return badRequest(passwordCheck.error || 'Password does not meet the requirements')
    }

    const tokenHash = hashResetToken(token)
    const tokenResult = await pool.query(
      `SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = $1 AND user_type = 'student'`,
      [tokenHash]
    )

    if (tokenResult.rows.length === 0) {
      return badRequest('Invalid or expired reset link')
    }

    const tokenData = tokenResult.rows[0]
    if (tokenData.used) {
      return badRequest('This reset link has already been used')
    }
    if (new Date() > new Date(tokenData.expires_at)) {
      return badRequest('This reset link has expired')
    }

    const hash = await bcrypt.hash(password, 10)
    await pool.query('UPDATE students SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      hash,
      tokenData.user_id,
    ])
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE token = $1', [tokenHash])
    await revokeAllStudentSessions(tokenData.user_id)

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (error) {
    return serverError('student-reset-password', error)
  }
}
