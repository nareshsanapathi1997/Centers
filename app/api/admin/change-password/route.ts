import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { verifyAdminAccess, getAdminToken } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const { centerId, currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Verify admin access
    const authResult = await verifyAdminAccess(token, parseInt(centerId))
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    // Get admin and verify current password
    const adminResult = await pool.query(
      'SELECT id, password_hash FROM center_admins WHERE id = $1',
      [authResult.adminId]
    )

    if (adminResult.rows.length === 0) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    const admin = adminResult.rows[0]
    const isValidPassword = await bcrypt.compare(currentPassword, admin.password_hash)

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password and clear the first-login force-change flag
    await pool.query(
      `UPDATE center_admins
       SET password_hash = $1, must_change_password = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, admin.id]
    )

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: admin.id,
        center_id: parseInt(centerId),
        action: 'change_password',
        entity_type: 'admin',
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
