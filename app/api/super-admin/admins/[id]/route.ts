import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { assignSuperAdminRole } from '@/lib/super-admin-access'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

// Update a super admin
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
    const { role_id: roleIdField, ...updateBody } = body
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updateBody.username !== undefined) {
      // Check if username already exists (excluding current user)
      const existingUser = await pool.query(
        'SELECT id FROM super_admins WHERE username = $1 AND id != $2',
        [updateBody.username, id]
      )
      if (existingUser.rows.length > 0) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
      }
      updates.push(`username = $${paramCount++}`)
      values.push(updateBody.username)
    }

    if (updateBody.email !== undefined) {
      // Check if email already exists (excluding current user)
      const existingUser = await pool.query(
        'SELECT id FROM super_admins WHERE email = $1 AND id != $2',
        [updateBody.email, id]
      )
      if (existingUser.rows.length > 0) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
      }
      updates.push(`email = $${paramCount++}`)
      values.push(updateBody.email)
    }

    if (updateBody.password !== undefined && updateBody.password.trim() !== '') {
      const passwordHash = await bcrypt.hash(updateBody.password, 10)
      updates.push(`password_hash = $${paramCount++}`)
      values.push(passwordHash)
    }

    if (updateBody.full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`)
      values.push(updateBody.full_name || null)
    }

    if (updateBody.is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`)
      values.push(updateBody.is_active)
    }

    const hasRoleUpdate = roleIdField !== undefined
    const hasFieldUpdates = updates.length > 0

    if (!hasFieldUpdates && !hasRoleUpdate) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    if (hasFieldUpdates) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(id)

      const result = await pool.query(
        `UPDATE super_admins 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING id, username, email, full_name, is_active, created_at, updated_at`,
        values
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Super admin not found' }, { status: 404 })
      }
    } else {
      const exists = await pool.query('SELECT id FROM super_admins WHERE id = $1', [id])
      if (exists.rows.length === 0) {
        return NextResponse.json({ error: 'Super admin not found' }, { status: 404 })
      }
    }

    if (hasRoleUpdate) {
      if (roleIdField === null || roleIdField === '') {
        await assignSuperAdminRole(id, null)
      } else {
        const parsedRoleId = parseInt(String(roleIdField), 10)
        if (isNaN(parsedRoleId)) {
          return NextResponse.json({ error: 'Invalid role ID' }, { status: 400 })
        }
        await assignSuperAdminRole(id, parsedRoleId)
      }
    }

    const withRole = await pool.query(
      `SELECT sa.id, sa.username, sa.email, sa.full_name, sa.is_active, sa.created_at, sa.updated_at,
              r.id AS role_id, r.name AS role_name
       FROM super_admins sa
       LEFT JOIN super_admin_user_roles ur ON ur.super_admin_id = sa.id
       LEFT JOIN super_admin_roles r ON r.id = ur.role_id
       WHERE sa.id = $1`,
      [id]
    )

    return NextResponse.json(withRole.rows[0])
  } catch (error: any) {
    console.error('Error updating super admin:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a super admin
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

    // Prevent deleting yourself
    const currentAdminId = authResult.adminId
    if (id === currentAdminId) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    await pool.query('DELETE FROM super_admins WHERE id = $1', [id])

    return NextResponse.json({ message: 'Super admin deleted successfully' })
  } catch (error) {
    console.error('Error deleting super admin:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
