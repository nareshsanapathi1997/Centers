import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireSuperAdminPermission } from '@/lib/super-admin-access'
import { parseBody, parseQuery, pageMeta } from '@/lib/api-validation'
import { badRequest, conflict, serverError } from '@/lib/api-response'
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
import { batchWriteSchema, superAdminBatchesListQuery } from '@/lib/course-batches-validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const perm = await requireSuperAdminPermission(request, 'batches', 'read')
    if (!perm.ok) return perm.response

    const parsed = parseQuery(request, superAdminBatchesListQuery)
    if (!parsed.ok) return parsed.response
    const { centerId, search, status, courseMasterId, limit, offset, page, pageSize } = parsed.data

    const params: unknown[] = []
    const conditions: string[] = []

    if (centerId) {
      params.push(centerId)
      conditions.push(`b.center_id = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(
        `(b.name ILIKE $${params.length} OR b.code ILIKE $${params.length} OR cm.title ILIKE $${params.length} OR c.name ILIKE $${params.length})`
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

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM course_batches b
       JOIN course_masters cm ON cm.id = b.course_master_id
       JOIN centers c ON c.id = b.center_id
       ${where}`,
      params
    )
    const total = countResult.rows[0]?.total ?? 0

    const result = await pool.query(
      `SELECT ${BATCH_SELECT},
              cm.title AS course_title, cm.slug AS course_slug,
              e.full_name AS faculty_name, e.employee_code AS faculty_code,
              c.name AS center_name, c.slug AS center_slug,
              (
                SELECT COUNT(*)::int FROM course_batch_enrollments en
                WHERE en.batch_id = b.id AND en.status = 'active'
              ) AS enrolled_count
       FROM course_batches b
       JOIN course_masters cm ON cm.id = b.course_master_id
       JOIN centers c ON c.id = b.center_id
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
    return serverError('sa-batches-list', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const perm = await requireSuperAdminPermission(request, 'batches', 'create')
    if (!perm.ok) return perm.response

    const parsed = await parseBody(request, batchWriteSchema)
    if (!parsed.ok) return parsed.response
    const data = parsed.data

    const courseOk = await assertCourseAssignable(data.courseMasterId, data.centerId)
    if (!courseOk) return badRequest('Course is not assigned to this center')

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
          user_type: 'super_admin',
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
    return serverError('sa-batches-create', error)
  }
}
