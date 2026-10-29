import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { signJwt } from '@/lib/jwt'
import { setSuperAdminCookie } from '@/lib/auth-cookies'
import { logActivity } from '@/lib/activity-log'
import { enforceRateLimit, clientIp } from '@/lib/payment-rate-limit'
import { parseBody } from '@/lib/api-validation'
import { serverError, unauthorized } from '@/lib/api-response'
import {

  clearAdminLoginAttempts,
  isAdminLoginLocked,
  recordFailedAdminLogin,
} from '@/lib/admin-login-lockout'
import { createAdminSession, generateAdminTokenJti } from '@/lib/admin-sessions'

export const dynamic = 'force-dynamic'

const LoginBody = z.object({
  username: z.string().trim().min(1, 'Username is required').max(255),
  password: z.string().min(1, 'Password is required').max(200),
})

export async function POST(request: NextRequest) {
  try {
    const rate = await enforceRateLimit(request, 'super-admin-login', 10, 60_000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
      )
    }

    const parsed = await parseBody(request, LoginBody)
    if (!parsed.ok) return parsed.response
    const { username, password } = parsed.data

    const lock = await isAdminLoginLocked('super_admin', username)
    if (lock.locked) {
      return NextResponse.json(
        { error: `Account temporarily locked. Try again in ${lock.retryAfterMinutes} minute(s).` },
        { status: 429 }
      )
    }

    const result = await pool.query(
      'SELECT * FROM super_admins WHERE username = $1 AND is_active = true',
      [username]
    )

    if (result.rows.length === 0) {
      await recordFailedAdminLogin('super_admin', username)
      return unauthorized('Invalid credentials')
    }

    const admin = result.rows[0]
    const isValidPassword = await bcrypt.compare(password, admin.password_hash)

    if (!isValidPassword) {
      await recordFailedAdminLogin('super_admin', username)
      return unauthorized('Invalid credentials')
    }

    await clearAdminLoginAttempts('super_admin', username)

    const jti = generateAdminTokenJti()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await createAdminSession({
      userType: 'super_admin',
      userId: admin.id,
      centerId: null,
      tokenJti: jti,
      expiresAt,
      userAgent: request.headers.get('user-agent'),
      ipAddress: clientIp(request),
    })

    const token = signJwt({ adminId: admin.id, isSuperAdmin: true, jti }, '7d')

    await logActivity(
      {
        user_type: 'super_admin',
        user_id: admin.id,
        center_id: null,
        action: 'login',
        entity_type: 'super_admin',
        entity_id: admin.id,
        entity_name: admin.username,
      },
      request
    )

    return setSuperAdminCookie(
      NextResponse.json({
        adminId: admin.id,
        username: admin.username,
        fullName: admin.full_name,
        mustChangePassword: Boolean(admin.must_change_password),
      }),
      token
    )
  } catch (error) {
    return serverError('super-admin-login', error)
  }
}
