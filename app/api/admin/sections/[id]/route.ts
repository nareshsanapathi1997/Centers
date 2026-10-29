import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'
import {

  COURSES_SECTION_KEY,
  centerHasCatalogCoursesById,
} from '@/lib/center-section-config'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { is_enabled, centerId } = await request.json()
    const id = parseInt(params.id)

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, parseInt(centerId), 'sections', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    // Get section details
    const section = await pool.query(
      'SELECT section_key FROM section_configs WHERE id = $1 AND center_id = $2',
      [id, parseInt(String(centerId), 10)]
    )

    if (section.rows.length === 0) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    const sectionKey = section.rows[0].section_key as string
    if (sectionKey === COURSES_SECTION_KEY) {
      const catalogCoursesAvailable = await centerHasCatalogCoursesById(parseInt(String(centerId), 10))
      if (catalogCoursesAvailable) {
        return NextResponse.json(
          {
            error:
              'Courses section is managed by Super Admin when catalog courses are available for this center.',
          },
          { status: 403 },
        )
      }
    }

    await pool.query(
      'UPDATE section_configs SET is_enabled = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [is_enabled, id]
    )

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: parseInt(centerId),
        action: 'update',
        entity_type: 'section',
        entity_id: id,
        entity_name: sectionKey.replace(/_/g, ' '),
        details: { is_enabled },
      },
      request
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating section:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

