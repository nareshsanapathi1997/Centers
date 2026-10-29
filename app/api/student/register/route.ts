import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { parseBody } from '@/lib/api-validation'
import { badRequest, conflict, notFound, serverError } from '@/lib/api-response'
import { signStudentToken, getTokenExpiryDate } from '@/lib/student-auth'
import { setStudentCookie } from '@/lib/auth-cookies'
import { generateStudentRegno, linkPaymentsToStudent } from '@/lib/student-portal-db'
import { validateStudentOtpCode } from '@/lib/student-otp'
import { enforceRateLimit, clientIp } from '@/lib/payment-rate-limit'
import { validatePassword } from '@/lib/password-policy'
import { createStudentSession, generateTokenJti } from '@/lib/student-sessions'
import { createEmailVerificationToken } from '@/lib/student-email-verification'

export const dynamic = 'force-dynamic'

function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

const RegisterBody = z.object({
  centerSlug: z.string().trim().min(1, 'Center is required').max(120),
  fullName: z.string().trim().min(1, 'Full name is required').max(200),
  // Optional-but-if-present-must-be-valid; '' is what an untouched field sends.
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((value) => value || undefined)
    .pipe(z.string().email('Enter a valid email address').optional()),
  mobile: z
    .string()
    .trim()
    .min(1, 'Mobile is required')
    .refine((value) => value.replace(/\D/g, '').length >= 10, 'Enter a valid 10-digit mobile'),
  // Strength is enforced by validatePassword so the policy lives in one place.
  password: z.string().min(1, 'Password is required').max(200),
  fatherName: z.string().trim().max(200).optional(),
  otp: z.string().trim().min(1, 'Mobile OTP verification is required').max(12),
})

export async function POST(request: NextRequest) {
  try {
    const rate = await enforceRateLimit(request, 'student-register', 5, 60_000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
      )
    }

    const parsed = await parseBody(request, RegisterBody)
    if (!parsed.ok) return parsed.response
    const { centerSlug, fullName, email, mobile, password, fatherName, otp } = parsed.data

    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) {
      return badRequest(passwordCheck.error || 'Password does not meet the requirements')
    }

    const centerResult = await pool.query(
      'SELECT id, name, slug FROM centers WHERE slug = $1 AND is_active = true',
      [centerSlug]
    )
    if (centerResult.rows.length === 0) {
      return notFound('Center not found')
    }

    const center = centerResult.rows[0]
    const normalizedMobile = normalizeMobile(mobile)
    const normalizedEmail = email?.toLowerCase() || null

    const otpCheck = await validateStudentOtpCode({
      centerId: center.id,
      mobile: normalizedMobile,
      otp: String(otp),
      purpose: 'register',
    })
    if (!otpCheck.valid) {
      return badRequest(otpCheck.error || 'Invalid OTP')
    }

    // $3 may be null when email is omitted.
    const existing = await pool.query(
      `SELECT id FROM students WHERE center_id = $1 AND (mobile = $2 OR ($3::text IS NOT NULL AND LOWER(email) = $3::text))`,
      [center.id, normalizedMobile, normalizedEmail]
    )
    if (existing.rows.length > 0) {
      return conflict('An account with this mobile or email already exists at this center')
    }

    const regno = await generateStudentRegno(center.id)
    const passwordHash = await bcrypt.hash(password, 10)

    const insertResult = await pool.query(
      `INSERT INTO students (center_id, regno, full_name, email, mobile, password_hash, father_name, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id, regno, full_name, email, mobile`,
      [center.id, regno, fullName, normalizedEmail, normalizedMobile, passwordHash, fatherName || null]
    )

    const student = insertResult.rows[0]
    await linkPaymentsToStudent(student.id, center.id, normalizedMobile)

    if (normalizedEmail) {
      createEmailVerificationToken(student.id).catch((err) =>
        console.error('Email verification send failed:', err)
      )
    }

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
    return serverError('student-register', error)
  }
}
