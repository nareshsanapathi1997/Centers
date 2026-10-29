import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { listCourseMaterials, getEnrolledStudentIdsForCourse } from '@/lib/student-materials-db'
import pool from '@/lib/db'
import { notifyStudentNewMaterial } from '@/lib/student-account-provisioning'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'course_materials', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const courseMasterId = request.nextUrl.searchParams.get('courseMasterId')
    const materials = await listCourseMaterials(
      centerId,
      courseMasterId ? parseInt(courseMasterId, 10) : undefined
    )

    return NextResponse.json({ materials })
  } catch (error) {
    console.error('Admin materials GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const centerId = parseInt(body.centerId, 10)
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'course_materials', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const { courseMasterId, title, description, fileUrl, fileType, sortOrder, notifyStudents } = body
    if (!courseMasterId || !title?.trim() || !fileUrl?.trim()) {
      return NextResponse.json({ error: 'Course, title, and file URL are required' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO student_course_materials
         (center_id, course_master_id, title, description, file_url, file_type, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        centerId,
        courseMasterId,
        title.trim(),
        description?.trim() || null,
        fileUrl.trim(),
        fileType || 'pdf',
        sortOrder ?? 0,
        perm.adminId,
      ]
    )

    const material = result.rows[0]

    if (notifyStudents !== false) {
      const [centerRes, courseRes, studentIds] = await Promise.all([
        pool.query('SELECT slug FROM centers WHERE id = $1', [centerId]),
        pool.query('SELECT title FROM course_masters WHERE id = $1', [courseMasterId]),
        getEnrolledStudentIdsForCourse(centerId, courseMasterId),
      ])
      if (studentIds.length > 0 && centerRes.rows[0]) {
        void notifyStudentNewMaterial({
          studentIds,
          centerId,
          centerSlug: centerRes.rows[0].slug,
          courseTitle: courseRes.rows[0]?.title || 'Course',
          materialTitle: title.trim(),
        })
      }
    }

    return NextResponse.json({ material })
  } catch (error) {
    console.error('Admin materials POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const centerId = parseInt(body.centerId, 10)
    const materialId = parseInt(body.materialId, 10)
    if (!centerId || !materialId) {
      return NextResponse.json({ error: 'centerId and materialId are required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'course_materials', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const result = await pool.query(
      `UPDATE student_course_materials SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         file_url = COALESCE($3, file_url),
         file_type = COALESCE($4, file_type),
         sort_order = COALESCE($5, sort_order),
         is_active = COALESCE($6, is_active),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND center_id = $8
       RETURNING *`,
      [
        body.title?.trim() || null,
        body.description?.trim() ?? null,
        body.fileUrl?.trim() || null,
        body.fileType || null,
        body.sortOrder ?? null,
        typeof body.isActive === 'boolean' ? body.isActive : null,
        materialId,
        centerId,
      ]
    )

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    return NextResponse.json({ material: result.rows[0] })
  } catch (error) {
    console.error('Admin materials PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    const materialId = parseInt(request.nextUrl.searchParams.get('materialId') || '', 10)
    if (!centerId || !materialId) {
      return NextResponse.json({ error: 'centerId and materialId are required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'course_materials', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    await pool.query('DELETE FROM student_course_materials WHERE id = $1 AND center_id = $2', [
      materialId,
      centerId,
    ])

    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error('Admin materials DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
