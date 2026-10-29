import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifyAdminAccess, getAdminToken } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

// Get admin profile
export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get('centerId')

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    // Verify admin access
    const authResult = await verifyAdminAccess(token, parseInt(centerId))
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    // Get admin profile
    const result = await pool.query(
      `SELECT id, username, email, full_name, is_active, created_at, updated_at, center_id
       FROM center_admins WHERE id = $1`,
      [authResult.adminId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Get center name
    const centerResult = await pool.query('SELECT name FROM centers WHERE id = $1', [
      result.rows[0].center_id,
    ])

    return NextResponse.json({
      ...result.rows[0],
      center_name: centerResult.rows[0]?.name || null,
    })
  } catch (error) {
    console.error('Error fetching admin profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update admin profile
export async function PATCH(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const { centerId, ...updates } = await request.json()

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    // Verify admin access
    const authResult = await verifyAdminAccess(token, parseInt(centerId))
    if (!authResult.authorized || authResult.adminId == null) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }
    const adminId = authResult.adminId

    // Build update query
    const updateFields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.email !== undefined) {
      // Check if email already exists (excluding current user)
      const existingUser = await pool.query(
        'SELECT id FROM center_admins WHERE email = $1 AND id != $2',
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

    // Update admin
    const result = await pool.query(
      `UPDATE center_admins 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, username, email, full_name, is_active, created_at, updated_at`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: adminId,
        center_id: parseInt(centerId),
        action: 'update',
        entity_type: 'admin_profile',
        entity_id: adminId,
        entity_name: 'Self',
        details: updates,
      },
      { headers: request.headers }
    )

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Error updating admin profile:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
