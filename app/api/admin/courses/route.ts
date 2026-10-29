import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { validateMainCourseName } from '@/lib/course-category-master'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const centerId = parseInt(searchParams.get('centerId') || '0')

    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'courses', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const result = await pool.query(
      'SELECT * FROM courses WHERE center_id = $1 ORDER BY display_order, name',
      [centerId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const body = await request.json()
    const { center_id, name, description, category, icon_class, display_order, is_active } = body

    if (!center_id) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, parseInt(center_id), 'courses', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const master = await validateMainCourseName(name)
    if (!master) {
      return NextResponse.json(
        { error: 'Invalid course. Please select a course from the master list.' },
        { status: 400 }
      )
    }
    let derivedCategory: string | null = category ?? null
    if (!derivedCategory) {
      if (master.type === 1) derivedCategory = 'college_level'
      else if (master.type === 2) derivedCategory = 'school_level'
      else derivedCategory = 'college_level'
    }

    const result = await pool.query(
      `INSERT INTO courses (center_id, name, description, category, icon_class, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [center_id, name, description || null, derivedCategory, icon_class || 'ri-book-open-line', display_order || 0, is_active !== false]
    )

    const newCourse = result.rows[0]

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: parseInt(center_id),
        action: 'create',
        entity_type: 'course',
        entity_id: newCourse.id,
        entity_name: name,
      },
      request
    )

    return NextResponse.json(newCourse)
  } catch (error) {
    console.error('Error creating course:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

