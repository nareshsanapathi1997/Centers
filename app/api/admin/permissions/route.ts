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

    const result = await pool.query('SELECT * FROM permissions ORDER BY resource, action')
    const catalogCoursesAvailable = await centerHasCatalogCoursesById(parseInt(centerId, 10))
    const filtered = filterPermissionsForCenter(result.rows, { catalogCoursesAvailable })

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
