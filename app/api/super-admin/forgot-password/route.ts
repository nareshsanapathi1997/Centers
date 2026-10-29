import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { createPasswordResetToken } from '@/lib/password-reset'
import { enforceRateLimit } from '@/lib/payment-rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Tighter than login: reset mails are an outbound-spam and enumeration vector.
    const rate = await enforceRateLimit(request, 'super-admin-forgot-password', 5, 15 * 60_000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
      )
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find super admin by email
    const result = await pool.query(
      'SELECT id FROM super_admins WHERE email = $1 AND is_active = true',
      [email]
    )

    // Always return success message (security best practice - don't reveal if email exists)
    if (result.rows.length > 0) {
      const adminId = result.rows[0].id

      // Get admin email for sending reset link
      const adminResult = await pool.query('SELECT email FROM super_admins WHERE id = $1', [
        adminId,
      ])

      if (adminResult.rows.length > 0) {
        await createPasswordResetToken('super_admin', adminId, adminResult.rows[0].email)
      }
    }

    return NextResponse.json({
      message:
        'If an account with that email exists, a password reset link has been sent to your email.',
    })
  } catch (error) {
    console.error('Error processing forgot password request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
