import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import {
  COURSES_SECTION_KEY,
  centerHasCatalogCoursesById,
} from '@/lib/center-section-config'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Mark this route as dynamic since it uses searchParams

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const centerId = parseInt(searchParams.get('centerId') || '0')

    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'sections', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const catalogCoursesAvailable = await centerHasCatalogCoursesById(centerId)

    const result = await pool.query(
      'SELECT * FROM section_configs WHERE center_id = $1 ORDER BY display_order',
      [centerId]
    )

    const sections = catalogCoursesAvailable
      ? result.rows.filter((row: { section_key: string }) => row.section_key !== COURSES_SECTION_KEY)
      : result.rows

    return NextResponse.json({
      sections,
      catalogCoursesAvailable,
    })
  } catch (error) {
    console.error('Error fetching sections:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

