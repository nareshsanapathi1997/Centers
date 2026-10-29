import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { parseBody } from '@/lib/api-validation'
import { notFound, serverError, unauthorized } from '@/lib/api-response'
import { signStudentToken, getTokenExpiryDate } from '@/lib/student-auth'
import { getStudentByLogin, linkPaymentsToStudent } from '@/lib/student-portal-db'
import { findActiveStudentsByLogin, pickPrimaryStudentAccount } from '@/lib/student-global-auth'
import { logActivity } from '@/lib/activity-log'
import { enforceRateLimit, clientIp } from '@/lib/payment-rate-limit'
import { isLoginLocked, recordFailedLogin, clearLoginAttempts } from '@/lib/student-login-lockout'
import { createStudentSession, generateTokenJti } from '@/lib/student-sessions'
import { setStudentCookie } from '@/lib/auth-cookies'

export const dynamic = 'force-dynamic'

async function completeLogin(
  request: NextRequest,
  center: { id: number; name: string; slug: string },
  student: { id: number; full_name: string; email: string | null; mobile: string; regno: string | null },
  loginKey: string
) {
  await clearLoginAttempts(center.id, loginKey)
  await pool.query('UPDATE students SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [student.id])
  await linkPaymentsToStudent(student.id, center.id, student.mobile)

  const jti = generateTokenJti()
  await createStudentSession({
    studentId: student.id,
    centerId: center.id,
    tokenJti: jti,
    expiresAt: getTokenExpiryDate(),
    userAgent: request.headers.get('user-agent'),
    ipAddress: clientIp(request),
  })

  const token = signStudentToken(student.id, center.id, jti)

  await logActivity(
    {
      user_type: 'student',
      user_id: student.id,
      center_id: center.id,
      action: 'login',
      entity_type: 'student',
      entity_id: student.id,
      entity_name: student.full_name,
    },
    request
  )

  return setStudentCookie(
    NextResponse.json({
      centerId: center.id,
      centerSlug: center.slug,
      centerName: center.name,
      student: {
        id: student.id,
        fullName: student.full_name,
        email: student.email,
        mobile: student.mobile,
        regno: student.regno,
      },
    }),
    token
  )
}

const LoginBody = z.object({
  // Absent means a global login across every center, so it stays optional.
  centerSlug: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
  login: z.string().trim().min(1, 'Login is required').max(255),
  password: z.string().min(1, 'Password is required').max(200),
})

export async function POST(request: NextRequest) {
  try {
    const rate = await enforceRateLimit(request, 'student-login', 10, 60_000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
      )
    }

    const parsed = await parseBody(request, LoginBody)
    if (!parsed.ok) return parsed.response
    const { centerSlug, login, password } = parsed.data

    // Global login — no centre picker; match mobile/email across all centres
    if (!centerSlug) {
      const candidates = await findActiveStudentsByLogin(login)
      let matched: (typeof candidates)[0] | null = null

      for (const row of candidates) {
        const valid = await bcrypt.compare(password, row.password_hash)
        if (valid) {
          matched = row
          break
        }
      }

      if (!matched) {
        const primary = pickPrimaryStudentAccount(candidates)
        if (primary) {
          await recordFailedLogin(primary.center_id, login)
        }
        return unauthorized('Invalid credentials')
      }

      const lock = await isLoginLocked(matched.center_id, login)
      if (lock.locked) {
        return NextResponse.json(
          { error: `Account temporarily locked. Try again in ${lock.retryAfterMinutes} minute(s).` },
          { status: 429 }
        )
      }

      return completeLogin(
        request,
        { id: matched.center_id, name: matched.center_name, slug: matched.center_slug },
        matched,
        login
      )
    }

    // Centre-scoped login (deep link from a centre site)
    const centerResult = await pool.query(
      'SELECT id, name, slug FROM centers WHERE slug = $1 AND is_active = true',
      [centerSlug]
    )
    if (centerResult.rows.length === 0) {
      return notFound('Center not found')
    }

    const center = centerResult.rows[0]
    const lock = await isLoginLocked(center.id, login)
    if (lock.locked) {
      return NextResponse.json(
        { error: `Account temporarily locked. Try again in ${lock.retryAfterMinutes} minute(s).` },
        { status: 429 }
      )
    }

    const student = await getStudentByLogin(center.id, login)

    if (!student) {
      await recordFailedLogin(center.id, login)
      return unauthorized('Invalid credentials')
    }

    const isValid = await bcrypt.compare(password, student.password_hash)
    if (!isValid) {
      await recordFailedLogin(center.id, login)
      return unauthorized('Invalid credentials')
    }

    return completeLogin(request, center, student, login)
  } catch (error) {
    return serverError('student-login', error)
  }
}
