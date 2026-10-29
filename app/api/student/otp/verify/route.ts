import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import pool from '@/lib/db'
import { parseBody } from '@/lib/api-validation'
import { badRequest, notFound, serverError, unauthorized } from '@/lib/api-response'
import { verifyStudentOtp } from '@/lib/student-otp'
import { signStudentToken, getTokenExpiryDate } from '@/lib/student-auth'
import { setStudentCookie } from '@/lib/auth-cookies'
import { linkPaymentsToStudent } from '@/lib/student-portal-db'
import { logActivity } from '@/lib/activity-log'
import { enforceRateLimit, clientIp } from '@/lib/payment-rate-limit'
import { createStudentSession, generateTokenJti } from '@/lib/student-sessions'
import { clearLoginAttempts } from '@/lib/student-login-lockout'

export const dynamic = 'force-dynamic'

function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

const VerifyBody = z.object({
  // Absent means the center is inferred from the outstanding OTP row.
  centerSlug: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
  mobile: z
    .string()
    .trim()
    .min(1, 'Mobile is required')
    .refine((value) => value.replace(/\D/g, '').length >= 10, 'Enter a valid 10-digit mobile'),
  // Coerced because some clients send the code as a number.
  otp: z.coerce.string().trim().min(4, 'Enter the OTP').max(12),
})

export async function POST(request: NextRequest) {
  try {
    const rate = await enforceRateLimit(request, 'student-otp-verify', 10, 60_000)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
    }

    const parsed = await parseBody(request, VerifyBody)
    if (!parsed.ok) return parsed.response
    const { centerSlug, mobile, otp } = parsed.data

    let centerId: number
    let center: { id: number; name: string; slug: string }

    if (centerSlug) {
      const centerResult = await pool.query(
        'SELECT id, name, slug FROM centers WHERE slug = $1 AND is_active = true',
        [centerSlug]
      )
      if (centerResult.rows.length === 0) {
        return notFound('Center not found')
      }
      center = centerResult.rows[0]
      centerId = center.id
    } else {
      const normalized = normalizeMobile(mobile)
      const otpRow = await pool.query(
        `SELECT center_id FROM student_otp_codes
         WHERE mobile = $1 AND used = false AND purpose = 'login'
         ORDER BY created_at DESC LIMIT 1`,
        [normalized]
      )
      if (otpRow.rows.length === 0) {
        return badRequest('OTP expired or not found. Request a new one.')
      }
      centerId = otpRow.rows[0].center_id
      const centerResult = await pool.query(
        'SELECT id, name, slug FROM centers WHERE id = $1 AND is_active = true',
        [centerId]
      )
      if (centerResult.rows.length === 0) {
        return notFound('Center not found')
      }
      center = centerResult.rows[0]
    }

    const verification = await verifyStudentOtp({ centerId, mobile, otp })

    if (!verification.valid || !verification.studentId) {
      return unauthorized(verification.error || 'Invalid OTP')
    }

    const studentResult = await pool.query(
      'SELECT id, full_name, email, mobile, regno FROM students WHERE id = $1',
      [verification.studentId]
    )
    const student = studentResult.rows[0]

    await clearLoginAttempts(center.id, student.mobile)
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
        details: { method: 'otp' },
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
  } catch (error) {
    return serverError('student-otp-verify', error)
  }
}
