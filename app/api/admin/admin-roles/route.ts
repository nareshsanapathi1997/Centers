import { NextRequest, NextResponse } from 'next/server'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    const centerId = searchParams.get('centerId')

    if (!adminId || !centerId) {
      return NextResponse.json({ error: 'Admin ID and Center ID are required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, parseInt(centerId), 'roles', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const result = await pool.query(
      `SELECT ar.*, r.name as role_name, r.description as role_description
       FROM admin_roles ar
       JOIN roles r ON ar.role_id = r.id
       WHERE ar.admin_id = $1 AND ar.center_id = $2`,
      [adminId, centerId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching admin roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
