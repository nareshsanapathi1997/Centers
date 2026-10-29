import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'
import { withBasePath } from '@/lib/with-base-path'
import { enforceRateLimit } from '@/lib/payment-rate-limit'
import { hashResetToken } from '@/lib/password-reset'

import { findActiveStudentByEmail } from '@/lib/student-global-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const rate = await enforceRateLimit(request, 'student-forgot-password', 5, 60_000)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
    }

    const { centerSlug, email } = await request.json()

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    let center: { id: number; slug: string; name: string }
    let student: { id: number; full_name: string; email: string }

    if (centerSlug) {
      const centerResult = await pool.query(
        'SELECT id, slug, name FROM centers WHERE slug = $1 AND is_active = true',
        [centerSlug]
      )
      if (centerResult.rows.length === 0) {
        return NextResponse.json({ error: 'Center not found' }, { status: 404 })
      }
      center = centerResult.rows[0]
      const studentResult = await pool.query(
        'SELECT id, full_name, email FROM students WHERE center_id = $1 AND LOWER(email) = LOWER($2) AND is_active = true',
        [center.id, email.trim()]
      )
      if (studentResult.rows.length === 0) {
        return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' })
      }
      student = studentResult.rows[0]
    } else {
      const match = await findActiveStudentByEmail(email.trim())
      if (!match) {
        return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' })
      }
      center = { id: match.center_id, slug: match.center_slug, name: match.center_name }
      student = { id: match.id, full_name: match.full_name, email: match.email! }
    }
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_type = $1 AND user_id = $2 AND used = false',
      ['student', student.id]
    )
    await pool.query(
      `INSERT INTO password_reset_tokens (user_type, user_id, token, expires_at) VALUES ($1, $2, $3, $4)`,
      ['student', student.id, hashResetToken(token), expiresAt]
    )

    const origin = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3600').replace(/\/+$/, '')
    const resetPath = withBasePath(
      centerSlug ? `/${center.slug}/student/reset-password?token=${token}` : `/student/reset-password?token=${token}`
    )
    const resetUrl = `${origin}${resetPath}`

    await sendEmail({
      to: student.email,
      subject: 'Reset your student portal password',
      html: `
        <p>Hello ${student.full_name},</p>
        <p>We received a request to reset your password for ${center.name} student portal.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
      `,
    })

    return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' })
  } catch (error) {
    console.error('Student forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
