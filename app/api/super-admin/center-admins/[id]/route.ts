import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

// Update a center admin
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const body = await request.json()
    const { role_id, ...adminUpdates } = body
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (body.username !== undefined) {
      // Check if username already exists (excluding current user)
      const existingUser = await pool.query(
        'SELECT id FROM center_admins WHERE username = $1 AND id != $2',
        [body.username, id]
      )
      if (existingUser.rows.length > 0) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
      }
      updates.push(`username = $${paramCount++}`)
      values.push(body.username)
    }

    if (body.email !== undefined) {
      // Check if email already exists (excluding current user)
      const existingUser = await pool.query(
        'SELECT id FROM center_admins WHERE email = $1 AND id != $2',
        [body.email, id]
      )
      if (existingUser.rows.length > 0) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
      }
      updates.push(`email = $${paramCount++}`)
      values.push(body.email)
    }

    if (body.password !== undefined && body.password.trim() !== '') {
      const passwordHash = await bcrypt.hash(body.password, 10)
      updates.push(`password_hash = $${paramCount++}`)
      values.push(passwordHash)
    }

    if (body.full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`)
      values.push(body.full_name || null)
    }

    if (body.center_id !== undefined) {
      updates.push(`center_id = $${paramCount++}`)
      values.push(body.center_id)
    }

    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`)
      values.push(body.is_active)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    // Get admin details before update for logging
    const adminBefore = await pool.query('SELECT center_id, username FROM center_admins WHERE id = $1', [id])
    const centerId = adminBefore.rows[0]?.center_id

    const result = await pool.query(
      `UPDATE center_admins 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, username, email, full_name, center_id, is_active, created_at, updated_at`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Center admin not found' }, { status: 404 })
    }

    // Update role if provided
    if (role_id !== undefined) {
      const finalCenterId = result.rows[0].center_id
      
      // Remove existing roles for this admin in this center
      await pool.query(
        'DELETE FROM admin_roles WHERE admin_id = $1 AND center_id = $2',
        [id, finalCenterId]
      )
      
      // Assign new role if provided
      if (role_id && role_id !== '') {
        try {
          await pool.query(
            `INSERT INTO admin_roles (admin_id, center_id, role_id, assigned_by_user_type, assigned_by_user_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (admin_id, center_id, role_id) DO NOTHING`,
            [id, finalCenterId, role_id, 'super_admin', authResult.adminId]
          )
        } catch (roleError) {
          console.error('Error assigning role:', roleError)
          // Don't fail admin update if role assignment fails
        }
      }
    }

    // Log activity
    await logActivity(
      {
        user_type: 'super_admin',
        user_id: authResult.adminId!,
        center_id: centerId || result.rows[0].center_id,
        action: 'update',
        entity_type: 'center_admin',
        entity_id: id,
        entity_name: result.rows[0].username,
        details: adminUpdates,
      },
      { headers: request.headers }
    )

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Error updating center admin:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a center admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    // Get admin details before deletion for logging
    const adminResult = await pool.query(
      'SELECT center_id, username FROM center_admins WHERE id = $1',
      [id]
    )

    if (adminResult.rows.length === 0) {
      return NextResponse.json({ error: 'Center admin not found' }, { status: 404 })
    }

    const centerId = adminResult.rows[0].center_id
    const username = adminResult.rows[0].username

    // Delete admin
    await pool.query('DELETE FROM center_admins WHERE id = $1', [id])

    // Log activity
    await logActivity(
      {
        user_type: 'super_admin',
        user_id: authResult.adminId!,
        center_id: centerId,
        action: 'delete',
        entity_type: 'center_admin',
        entity_id: id,
        entity_name: username,
      },
      { headers: request.headers }
    )

    return NextResponse.json({ message: 'Center admin deleted successfully' })
  } catch (error) {
    console.error('Error deleting center admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
