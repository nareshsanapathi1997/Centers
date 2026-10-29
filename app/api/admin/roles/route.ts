import { NextRequest, NextResponse } from 'next/server'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import pool from '@/lib/db'
import { filterPermissionsForCenter } from '@/lib/admin-permission-catalog'
import { centerHasCatalogCoursesById } from '@/lib/center-section-config'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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

    const perm = await requireAdminPermission(token, parseInt(centerId), 'roles', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const catalogCoursesAvailable = await centerHasCatalogCoursesById(parseInt(centerId, 10))

    // Only this center's own roles plus the platform-wide system roles.
    // Without the center_id filter every admin could enumerate other tenants' roles.
    const result = await pool.query(
      `SELECT r.* FROM roles r
       WHERE r.center_id = $1 OR r.center_id IS NULL
       ORDER BY r.name`,
      [parseInt(centerId, 10)]
    )
    const links = await pool.query(
      `SELECT rp.role_id, p.id, p.name, p.resource, p.action
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = ANY($1)`,
      [result.rows.map((role) => role.id)]
    )

    const roles = result.rows.map((role) => ({
      ...role,
      permissions: filterPermissionsForCenter(
        links.rows.filter((l) => l.role_id === role.id).map(({ role_id: _roleId, ...p }) => p),
        { catalogCoursesAvailable }
      ),
    }))

    return NextResponse.json(roles)
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const { centerId, name, description, permission_ids } = await request.json()

    if (!centerId || !name) {
      return NextResponse.json({ error: 'Center ID and name are required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, parseInt(centerId), 'roles', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    // Roles created by a center admin belong to that center only.
    const roleResult = await pool.query(
      'INSERT INTO roles (name, description, center_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, parseInt(centerId, 10)]
    )

    const roleId = roleResult.rows[0].id

    // Assign permissions
    if (permission_ids && Array.isArray(permission_ids) && permission_ids.length > 0) {
      for (const permId of permission_ids) {
        await pool.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [roleId, permId]
        )
      }
    }

    return NextResponse.json(roleResult.rows[0], { status: 201 })
  } catch (error: any) {
    console.error('Error creating role:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Role name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
