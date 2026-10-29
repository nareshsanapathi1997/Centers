import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const id = parseInt(params.id, 10)
    const { name, description, permission_ids } = await request.json()

    const roleResult = await pool.query(
      `UPDATE super_admin_roles
       SET name = COALESCE($1, name),
           description = COALESCE($2, description)
       WHERE id = $3
       RETURNING *`,
      [name, description, id]
    )

    if (roleResult.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (permission_ids !== undefined) {
      await pool.query('DELETE FROM super_admin_role_permissions WHERE role_id = $1', [id])
      if (Array.isArray(permission_ids) && permission_ids.length > 0) {
        for (const permId of permission_ids) {
          await pool.query(
            'INSERT INTO super_admin_role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [id, permId]
          )
        }
      }
    }

    return NextResponse.json(roleResult.rows[0])
  } catch (error: any) {
    console.error('Error updating super admin role:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const id = parseInt(params.id, 10)
    const existing = await pool.query('SELECT is_system_role FROM super_admin_roles WHERE id = $1', [id])

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (existing.rows[0].is_system_role) {
      return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 400 })
    }

    await pool.query('DELETE FROM super_admin_roles WHERE id = $1', [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting super admin role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
