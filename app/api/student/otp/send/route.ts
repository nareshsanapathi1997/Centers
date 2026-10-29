import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import pool from '@/lib/db'
import { sendStudentOtp } from '@/lib/student-otp'
import { enforceRateLimit } from '@/lib/payment-rate-limit'
import { findActiveStudentsByMobile, pickPrimaryStudentAccount } from '@/lib/student-global-auth'
import { parseBody } from '@/lib/api-validation'
import { badRequest, notFound } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const SendOtpBody = z.object({
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
  purpose: z.enum(['login', 'register']).default('login'),
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((value) => value || undefined)
    .pipe(z.string().email('Enter a valid email address').optional()),
})

export async function POST(request: NextRequest) {
  try {
    const rate = await enforceRateLimit(request, 'student-otp-send', 5, 60_000)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many OTP requests. Try again later.' }, { status: 429 })
    }

    const parsed = await parseBody(request, SendOtpBody)
    if (!parsed.ok) return parsed.response
    const { centerSlug, mobile, purpose, email } = parsed.data

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
    } else if (purpose === 'register') {
      return badRequest('Please select your centre to register')
    } else {
      const students = await findActiveStudentsByMobile(mobile)
      const primary = pickPrimaryStudentAccount(students)
      if (!primary) {
        return notFound('No student account found with this mobile number')
      }
      center = { id: primary.center_id, name: primary.center_name, slug: primary.center_slug }
    }

    const result = await sendStudentOtp({
      centerId: center.id,
      centerName: center.name,
      centerSlug: center.slug,
      mobile,
      purpose,
      registrationEmail: purpose === 'register' ? email : undefined,
    })

    return NextResponse.json({
      message: 'OTP sent successfully',
      centerSlug: center.slug,
      ...(result.devOtp ? { devOtp: result.devOtp } : {}),
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send OTP' },
      { status: 400 }
    )
  }
}
