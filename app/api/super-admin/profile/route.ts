import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

// Get super admin profile
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized || authResult.adminId == null) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }
    const adminId = authResult.adminId

    // Get super admin profile
    const result = await pool.query(
      `SELECT id, username, email, full_name, is_active, created_at, updated_at
       FROM super_admins WHERE id = $1`,
      [adminId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Super admin not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching super admin profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update super admin profile
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized || authResult.adminId == null) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }
    const adminId = authResult.adminId

    const updates = await request.json()

    // Build update query
    const updateFields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.email !== undefined) {
      // Check if email already exists (excluding current user)
      const existingUser = await pool.query(
        'SELECT id FROM super_admins WHERE email = $1 AND id != $2',
        [updates.email, adminId]
      )
      if (existingUser.rows.length > 0) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
      }
      updateFields.push(`email = $${paramCount++}`)
      values.push(updates.email)
    }

    if (updates.full_name !== undefined) {
      updateFields.push(`full_name = $${paramCount++}`)
      values.push(updates.full_name || null)
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(adminId)

    // Update super admin
    const result = await pool.query(
      `UPDATE super_admins 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, username, email, full_name, is_active, created_at, updated_at`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Super admin not found' }, { status: 404 })
    }

    // Log activity
    await logActivity(
      {
        user_type: 'super_admin',
        user_id: adminId,
        action: 'update',
        entity_type: 'super_admin_profile',
        entity_id: adminId,
        entity_name: 'Self',
        details: updates,
      },
      { headers: request.headers }
    )

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Error updating super admin profile:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
