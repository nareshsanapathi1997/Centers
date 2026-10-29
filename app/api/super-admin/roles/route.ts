import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const result = await pool.query(`SELECT r.* FROM super_admin_roles r ORDER BY r.name`)
    const links = await pool.query(`
      SELECT rp.role_id, p.id, p.name, p.resource, p.action
      FROM super_admin_role_permissions rp
      JOIN super_admin_permissions p ON rp.permission_id = p.id
    `)

    return NextResponse.json(
      result.rows.map((role) => ({
        ...role,
        permissions: links.rows.filter((l) => l.role_id === role.id).map(({ role_id: _roleId, ...p }) => p),
      }))
    )
  } catch (error) {
    console.error('Error fetching super admin roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const { name, description, permission_ids } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 })
    }

    const roleResult = await pool.query(
      'INSERT INTO super_admin_roles (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || null]
    )

    const roleId = roleResult.rows[0].id

    if (Array.isArray(permission_ids) && permission_ids.length > 0) {
      for (const permId of permission_ids) {
        await pool.query(
          'INSERT INTO super_admin_role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [roleId, permId]
        )
      }
    }

    return NextResponse.json(roleResult.rows[0], { status: 201 })
  } catch (error: any) {
    console.error('Error creating super admin role:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
