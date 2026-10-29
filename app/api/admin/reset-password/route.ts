import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { verifyPasswordResetToken, markTokenAsUsed } from '@/lib/password-reset'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Verify token
    const tokenVerification = await verifyPasswordResetToken(token)
    if (!tokenVerification.valid || !tokenVerification.userType || !tokenVerification.userId) {
      return NextResponse.json({ error: tokenVerification.error || 'Invalid or expired token' }, { status: 400 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    if (tokenVerification.userType === 'admin') {
      await pool.query(
        'UPDATE center_admins SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, tokenVerification.userId]
      )

      // Get center_id for logging
      const adminResult = await pool.query('SELECT center_id FROM center_admins WHERE id = $1', [
        tokenVerification.userId,
      ])

      // Log activity
      if (adminResult.rows.length > 0) {
        await logActivity(
          {
            user_type: 'admin',
            user_id: tokenVerification.userId,
            center_id: adminResult.rows[0].center_id,
            action: 'reset_password',
            entity_type: 'admin',
            entity_id: tokenVerification.userId,
            entity_name: 'Self',
          },
          { headers: request.headers }
        )
      }
    } else {
      await pool.query(
        'UPDATE super_admins SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, tokenVerification.userId]
      )

      // Log activity
      await logActivity(
        {
          user_type: 'super_admin',
          user_id: tokenVerification.userId,
          action: 'reset_password',
          entity_type: 'super_admin',
          entity_id: tokenVerification.userId,
          entity_name: 'Self',
        },
        { headers: request.headers }
      )
    }

    // Mark token as used
    await markTokenAsUsed(token)

    return NextResponse.json({ message: 'Password reset successfully' })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
