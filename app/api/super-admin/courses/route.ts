import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { validateMainCourseName } from '@/lib/course-category-master'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '0', 10)
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const centerCheck = await pool.query('SELECT id FROM centers WHERE id = $1', [centerId])
    if (centerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }

    const result = await pool.query(
      'SELECT * FROM courses WHERE center_id = $1 ORDER BY display_order, name',
      [centerId],
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('[super-admin/courses GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { center_id, name, description, icon_class, display_order, is_active } = body

    if (!center_id) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    const centerCheck = await pool.query('SELECT id FROM centers WHERE id = $1', [center_id])
    if (centerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }

    const master = await validateMainCourseName(name)
    if (!master) {
      return NextResponse.json(
        { error: 'Invalid course. Please select a course from the master list.' },
        { status: 400 },
      )
    }

    let derivedCategory: string | null = null
    if (master.type === 1) derivedCategory = 'college_level'
    else if (master.type === 2) derivedCategory = 'school_level'
    else derivedCategory = 'college_level'

    const result = await pool.query(
      `INSERT INTO courses (center_id, name, description, category, icon_class, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        center_id,
        name,
        description || null,
        derivedCategory,
        icon_class || 'ri-book-open-line',
        display_order || 0,
        is_active !== false,
      ],
    )

    const newCourse = result.rows[0]

    await logActivity(
      {
        user_type: 'super_admin',
        user_id: authResult.adminId!,
        center_id: parseInt(center_id, 10),
        action: 'create',
        entity_type: 'course',
        entity_id: newCourse.id,
        entity_name: name,
      },
      request,
    )

    return NextResponse.json(newCourse)
  } catch (error) {
    console.error('[super-admin/courses POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
