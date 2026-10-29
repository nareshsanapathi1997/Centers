import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Get super admin and verify current password
    const adminResult = await pool.query(
      'SELECT id, password_hash FROM super_admins WHERE id = $1',
      [authResult.adminId]
    )

    if (adminResult.rows.length === 0) {
      return NextResponse.json({ error: 'Super admin not found' }, { status: 404 })
    }

    const admin = adminResult.rows[0]
    const isValidPassword = await bcrypt.compare(currentPassword, admin.password_hash)

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await pool.query(
      'UPDATE super_admins SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, admin.id]
    )

    // Log activity
    await logActivity(
      {
        user_type: 'super_admin',
        user_id: admin.id,
        action: 'change_password',
        entity_type: 'super_admin',
        entity_id: admin.id,
        entity_name: 'Self',
      },
      { headers: request.headers }
    )

    return NextResponse.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
