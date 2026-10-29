import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission } from '@/lib/admin-access'
import { parseBody } from '@/lib/api-validation'
import { unauthorized, notFound, conflict, serverError, badRequest } from '@/lib/api-response'
import { logActivity } from '@/lib/activity-log'
import {

  assertStudentInCenter,
  countActiveEnrollments,
  enrollStudent,
  getBatchById,
  isUniqueViolation,
  listBatchEnrollments,
  removeEnrollment,
  uniqueViolationMessage,
} from '@/lib/course-batches-db'
import { enrollStudentSchema } from '@/lib/course-batches-validation'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const batchId = Number(params.id)
    if (!Number.isInteger(batchId) || batchId <= 0) return badRequest('Invalid batch id')

    const centerId = Number(request.nextUrl.searchParams.get('centerId') || 0)
    if (!centerId) return badRequest('centerId is required')

    const perm = await requireAdminPermission(token, centerId, 'batches', 'read')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const batch = await getBatchById(batchId, centerId)
    if (!batch) return notFound('Batch not found')

    const enrollments = await listBatchEnrollments(batchId)
    return NextResponse.json({ enrollments, enrolledCount: batch.enrolled_count ?? 0 })
  } catch (error) {
    return serverError('admin-batch-enrollments-list', error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const batchId = Number(params.id)
    if (!Number.isInteger(batchId) || batchId <= 0) return badRequest('Invalid batch id')

    const parsed = await parseBody(request, enrollStudentSchema)
    if (!parsed.ok) return parsed.response

    const centerId = Number(request.nextUrl.searchParams.get('centerId') || 0)
    if (!centerId) return badRequest('centerId is required')

    const perm = await requireAdminPermission(token, centerId, 'batches', 'update')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const batch = await getBatchById(batchId, centerId)
    if (!batch) return notFound('Batch not found')

    const studentOk = await assertStudentInCenter(parsed.data.studentId, centerId)
    if (!studentOk) return badRequest('Student must belong to this center')

    const activeCount = await countActiveEnrollments(batchId)
    const already = (await listBatchEnrollments(batchId)).find(
      (e) => e.student_id === parsed.data.studentId && e.status === 'active'
    )
    if (!already && batch.capacity != null && activeCount >= batch.capacity) {
      return badRequest(`Batch is at capacity (${batch.capacity})`)
    }

    try {
      const enrollment = await enrollStudent({
        batchId,
        studentId: parsed.data.studentId,
        notes: parsed.data.notes,
      })
      await logActivity(
        {
          user_type: 'admin',
          user_id: perm.adminId,
          center_id: centerId,
          action: 'update',
          entity_type: 'course_batch_enrollment',
          entity_id: enrollment.id,
          entity_name: enrollment.student_name || String(parsed.data.studentId),
        },
        request
      )
      return NextResponse.json({ enrollment }, { status: 201 })
    } catch (error) {
      if (isUniqueViolation(error)) return conflict(uniqueViolationMessage(error))
      throw error
    }
  } catch (error) {
    return serverError('admin-batch-enrollments-add', error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const batchId = Number(params.id)
    if (!Number.isInteger(batchId) || batchId <= 0) return badRequest('Invalid batch id')

    const centerId = Number(request.nextUrl.searchParams.get('centerId') || 0)
    const studentId = Number(request.nextUrl.searchParams.get('studentId') || 0)
    const hard = request.nextUrl.searchParams.get('hard') === 'true'
    if (!centerId) return badRequest('centerId is required')
    if (!studentId) return badRequest('studentId is required')

    const perm = await requireAdminPermission(token, centerId, 'batches', 'update')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const batch = await getBatchById(batchId, centerId)
    if (!batch) return notFound('Batch not found')

    const removed = await removeEnrollment(batchId, studentId, hard)
    if (!removed) return notFound('Enrollment not found')

    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'update',
        entity_type: 'course_batch_enrollment',
        entity_id: batchId,
        entity_name: `removed student ${studentId}`,
      },
      request
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return serverError('admin-batch-enrollments-remove', error)
  }
}
