import { NextRequest, NextResponse } from 'next/server'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/activity-log'
import { isRoleAssignableByCenter } from '@/lib/role-scope'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Update a center admin (only accessible by admins of that center)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    // Get admin's center_id first
    const adminResult = await pool.query('SELECT center_id FROM center_admins WHERE id = $1', [id])
    if (adminResult.rows.length === 0) {
      return NextResponse.json({ error: 'Center admin not found' }, { status: 404 })
    }

    const centerId = adminResult.rows[0].center_id

    // Verify admin access to this center
    const perm = await requireAdminPermission(token, centerId, 'center_admins', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const body = await request.json()
    const { role_id, ...adminUpdates } = body

    if (role_id && !(await isRoleAssignableByCenter(role_id, centerId))) {
      return NextResponse.json({ error: 'Invalid role for this center' }, { status: 400 })
    }

    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (adminUpdates.username !== undefined) {
      // Check if username already exists (excluding current user)
      const existingUser = await pool.query(
        'SELECT id FROM center_admins WHERE username = $1 AND id != $2',
        [adminUpdates.username, id]
      )
      if (existingUser.rows.length > 0) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
      }
      updates.push(`username = $${paramCount++}`)
      values.push(adminUpdates.username)
    }

    if (adminUpdates.email !== undefined) {
      // Check if email already exists (excluding current user)
      const existingUser = await pool.query(
        'SELECT id FROM center_admins WHERE email = $1 AND id != $2',
        [adminUpdates.email, id]
      )
      if (existingUser.rows.length > 0) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
      }
      updates.push(`email = $${paramCount++}`)
      values.push(adminUpdates.email)
    }

    if (adminUpdates.password !== undefined && adminUpdates.password.trim() !== '') {
      const passwordHash = await bcrypt.hash(adminUpdates.password, 10)
      updates.push(`password_hash = $${paramCount++}`)
      values.push(passwordHash)
    }

    if (adminUpdates.full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`)
      values.push(adminUpdates.full_name || null)
    }

    if (adminUpdates.is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`)
      values.push(adminUpdates.is_active)
    }

    if (updates.length === 0 && role_id === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(id)

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
    }

    // Update role if provided
    if (role_id !== undefined) {
      // Remove existing roles for this admin in this center
      await pool.query(
        'DELETE FROM admin_roles WHERE admin_id = $1 AND center_id = $2',
        [id, centerId]
      )

      // Assign new role if provided
      if (role_id && role_id !== '') {
        try {
          await pool.query(
            `INSERT INTO admin_roles (admin_id, center_id, role_id, assigned_by_user_type, assigned_by_user_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (admin_id, center_id, role_id) DO NOTHING`,
            [id, centerId, role_id, 'admin', perm.adminId]
          )
        } catch (roleError) {
          console.error('Error assigning role:', roleError)
          // Don't fail admin update if role assignment fails
        }
      }
    }

    // Get updated admin data
    const updatedAdmin = await pool.query(
      'SELECT id, username, email, full_name, center_id, is_active, created_at, updated_at FROM center_admins WHERE id = $1',
      [id]
    )

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'update',
        entity_type: 'center_admin',
        entity_id: id,
        entity_name: updatedAdmin.rows[0].username,
        details: adminUpdates,
      },
      { headers: request.headers }
    )

    return NextResponse.json(updatedAdmin.rows[0])
  } catch (error: any) {
    console.error('Error updating center admin:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a center admin (only accessible by admins of that center)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
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

    // Verify admin access to this center
    const perm = await requireAdminPermission(token, centerId, 'center_admins', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    // Prevent deleting yourself
    if (perm.adminId === id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    // Delete admin
    await pool.query('DELETE FROM center_admins WHERE id = $1', [id])

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
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
