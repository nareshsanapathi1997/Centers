import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { parseBody, parseQuery, pageMeta } from '@/lib/api-validation'
import { unauthorized, conflict, serverError, badRequest } from '@/lib/api-response'
import { logActivity } from '@/lib/activity-log'
import {

  assertCourseAssignable,
  assertEmployeeInCenter,
  assertPricingBatchForCourse,
  BATCH_SELECT,
  createBatch,
  isUniqueViolation,
  uniqueViolationMessage,
} from '@/lib/course-batches-db'
import { adminBatchesListQuery, batchWriteSchema } from '@/lib/course-batches-validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const parsed = parseQuery(request, adminBatchesListQuery)
    if (!parsed.ok) return parsed.response
    const { centerId, search, status, courseMasterId, limit, offset, page, pageSize } = parsed.data

    const perm = await requireAdminPermission(token, centerId, 'batches', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const params: unknown[] = [centerId]
    const conditions = ['b.center_id = $1']

    if (search) {
      params.push(`%${search}%`)
      conditions.push(
        `(b.name ILIKE $${params.length} OR b.code ILIKE $${params.length} OR cm.title ILIKE $${params.length})`
      )
    }
    if (status) {
      params.push(status)
      conditions.push(`b.status = $${params.length}`)
    }
    if (courseMasterId) {
      params.push(courseMasterId)
      conditions.push(`b.course_master_id = $${params.length}`)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM course_batches b
       JOIN course_masters cm ON cm.id = b.course_master_id
       ${where}`,
      params
    )
    const total = countResult.rows[0]?.total ?? 0

    const result = await pool.query(
      `SELECT ${BATCH_SELECT},
              cm.title AS course_title, cm.slug AS course_slug,
              e.full_name AS faculty_name, e.employee_code AS faculty_code,
              (
                SELECT COUNT(*)::int FROM course_batch_enrollments en
                WHERE en.batch_id = b.id AND en.status = 'active'
              ) AS enrolled_count
       FROM course_batches b
       JOIN course_masters cm ON cm.id = b.course_master_id
       LEFT JOIN employees e ON e.id = b.faculty_employee_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    return NextResponse.json({
      batches: result.rows,
      pagination: pageMeta({ page, pageSize, limit, offset }, total),
    })
  } catch (error) {
    return serverError('admin-batches-list', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const parsed = await parseBody(request, batchWriteSchema)
    if (!parsed.ok) return parsed.response
    const data = parsed.data

    const perm = await requireAdminPermission(
      token,
      data.centerId,
      'batches',
      httpMethodToAction(request.method)
    )
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const courseOk = await assertCourseAssignable(data.courseMasterId, data.centerId)
    if (!courseOk) {
      return badRequest('Course is not assigned to this center')
    }

    if (data.facultyEmployeeId) {
      const facultyOk = await assertEmployeeInCenter(data.facultyEmployeeId, data.centerId)
      if (!facultyOk) return badRequest('Faculty employee must belong to this center')
    }

    if (data.courseMasterBatchId) {
      const pricingOk = await assertPricingBatchForCourse(
        data.courseMasterBatchId,
        data.courseMasterId
      )
      if (!pricingOk) {
        return badRequest('Pricing batch must belong to the selected course')
      }
    }

    try {
      const batch = await createBatch({
        centerId: data.centerId,
        courseMasterId: data.courseMasterId,
        name: data.name,
        code: data.code,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        capacity: data.capacity,
        facultyEmployeeId: data.facultyEmployeeId,
        courseMasterBatchId: data.courseMasterBatchId,
        notes: data.notes,
      })
      await logActivity(
        {
          user_type: 'admin',
          user_id: perm.adminId,
          center_id: data.centerId,
          action: 'create',
          entity_type: 'course_batch',
          entity_id: batch.id,
          entity_name: batch.name,
        },
        request
      )
      return NextResponse.json({ batch }, { status: 201 })
    } catch (error) {
      if (isUniqueViolation(error)) return conflict(uniqueViolationMessage(error))
      throw error
    }
  } catch (error) {
    return serverError('admin-batches-create', error)
  }
}
