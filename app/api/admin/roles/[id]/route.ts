import { NextRequest, NextResponse } from 'next/server'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * A center admin may only touch roles owned by their own center. Global roles
 * (center_id IS NULL) are visible to everyone but editable only by super-admins,
 * otherwise one tenant could rewrite the permissions every center relies on.
 */
async function assertRoleBelongsToCenter(roleId: number, centerId: number) {
  const result = await pool.query('SELECT center_id FROM roles WHERE id = $1', [roleId])
  if (result.rows.length === 0) {
    return { ok: false as const, error: 'Role not found', status: 404 }
  }
  if (result.rows[0].center_id === null) {
    return { ok: false as const, error: 'System roles cannot be modified', status: 403 }
  }
  if (Number(result.rows[0].center_id) !== centerId) {
    return { ok: false as const, error: 'Role not found', status: 404 }
  }
  return { ok: true as const }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const perm = await requireAdminPermission(token, parseInt(centerId), 'roles', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const id = parseInt(params.id)

    const owned = await assertRoleBelongsToCenter(id, parseInt(centerId))
    if (!owned.ok) return NextResponse.json({ error: owned.error }, { status: owned.status })

    const { name, description, permission_ids } = await request.json()

    // Update role
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`)
      values.push(name)
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`)
      values.push(description || null)
    }

    if (updates.length > 0) {
      values.push(id)
      await pool.query(`UPDATE roles SET ${updates.join(', ')} WHERE id = $${paramCount}`, values)
    }

    // Update permissions
    if (permission_ids !== undefined) {
      // Remove all existing permissions
      await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [id])

      // Add new permissions
      if (Array.isArray(permission_ids) && permission_ids.length > 0) {
        for (const permId of permission_ids) {
          await pool.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [id, permId]
          )
        }
      }
    }

    const result = await pool.query('SELECT * FROM roles WHERE id = $1', [id])
    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Error updating role:', error)
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
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get('centerId')

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, parseInt(centerId), 'roles', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const id = parseInt(params.id)

    const owned = await assertRoleBelongsToCenter(id, parseInt(centerId))
    if (!owned.ok) return NextResponse.json({ error: owned.error }, { status: owned.status })

    // Check if it's a system role
    const roleResult = await pool.query('SELECT is_system_role FROM roles WHERE id = $1', [id])
    if (roleResult.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (roleResult.rows[0].is_system_role) {
      return NextResponse.json({ error: 'Cannot delete system role' }, { status: 400 })
    }

    await pool.query('DELETE FROM roles WHERE id = $1', [id])
    return NextResponse.json({ message: 'Role deleted successfully' })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
