import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { validateMainCourseName } from '@/lib/course-category-master'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const id = parseInt(params.id, 10)
    const result = await pool.query('SELECT * FROM courses WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('[super-admin/courses/[id] GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const id = parseInt(params.id, 10)
    const existingItem = await pool.query('SELECT center_id, name FROM courses WHERE id = $1', [id])
    if (existingItem.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const centerId = existingItem.rows[0].center_id
    const body = await request.json()
    const { name, description, category, icon_class, display_order, is_active } = body

    let finalCategory = category || null
    if (name) {
      const master = await validateMainCourseName(name)
      if (!master) {
        return NextResponse.json(
          { error: 'Invalid course. Please select a course from the master list.' },
          { status: 400 },
        )
      }
      if (!finalCategory) {
        if (master.type === 1) finalCategory = 'college_level'
        else if (master.type === 2) finalCategory = 'school_level'
        else finalCategory = 'college_level'
      }
    }

    const result = await pool.query(
      `UPDATE courses
       SET name = $1, description = $2, category = $3, icon_class = $4, display_order = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        name,
        description !== undefined ? description : null,
        finalCategory,
        icon_class || 'ri-book-open-line',
        display_order || 0,
        is_active !== false,
        id,
      ],
    )

    await logActivity(
      {
        user_type: 'super_admin',
        user_id: authResult.adminId!,
        center_id: centerId,
        action: 'update',
        entity_type: 'course',
        entity_id: id,
        entity_name: name || existingItem.rows[0].name,
        details: body,
      },
      request,
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('[super-admin/courses/[id] PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const id = parseInt(params.id, 10)
    const existingItem = await pool.query('SELECT center_id, name FROM courses WHERE id = $1', [id])
    if (existingItem.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const centerId = existingItem.rows[0].center_id
    const name = existingItem.rows[0].name

    await pool.query('DELETE FROM courses WHERE id = $1', [id])

    await logActivity(
      {
        user_type: 'super_admin',
        user_id: authResult.adminId!,
        center_id: centerId,
        action: 'delete',
        entity_type: 'course',
        entity_id: id,
        entity_name: name,
      },
      request,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[super-admin/courses/[id] DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
