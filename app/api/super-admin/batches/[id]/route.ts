import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminPermission } from '@/lib/super-admin-access'
import { parseBody } from '@/lib/api-validation'
import { badRequest, conflict, notFound, serverError } from '@/lib/api-response'
import { logActivity } from '@/lib/activity-log'
import {

  assertCourseAssignable,
  assertEmployeeInCenter,
  assertPricingBatchForCourse,
  deleteBatch,
  getBatchById,
  isUniqueViolation,
  listBatchEnrollments,
  uniqueViolationMessage,
  updateBatch,
} from '@/lib/course-batches-db'
import { batchUpdateSchema } from '@/lib/course-batches-validation'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const perm = await requireSuperAdminPermission(request, 'batches', 'read')
    if (!perm.ok) return perm.response

    const batchId = Number(params.id)
    if (!Number.isInteger(batchId) || batchId <= 0) return badRequest('Invalid batch id')

    const batch = await getBatchById(batchId)
    if (!batch) return notFound('Batch not found')

    const enrollments = await listBatchEnrollments(batchId)
    return NextResponse.json({ batch, enrollments })
  } catch (error) {
    return serverError('sa-batches-get', error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const perm = await requireSuperAdminPermission(request, 'batches', 'update')
    if (!perm.ok) return perm.response

    const batchId = Number(params.id)
    if (!Number.isInteger(batchId) || batchId <= 0) return badRequest('Invalid batch id')

    const existing = await getBatchById(batchId)
    if (!existing) return notFound('Batch not found')

    const parsed = await parseBody(request, batchUpdateSchema)
    if (!parsed.ok) return parsed.response

    const centerId = parsed.data.centerId || existing.center_id

    if (parsed.data.courseMasterId) {
      const courseOk = await assertCourseAssignable(parsed.data.courseMasterId, centerId)
      if (!courseOk) return badRequest('Course is not assigned to this center')
    }

    if (parsed.data.facultyEmployeeId) {
      const facultyOk = await assertEmployeeInCenter(parsed.data.facultyEmployeeId, centerId)
      if (!facultyOk) return badRequest('Faculty employee must belong to this center')
    }

    const nextCourseId = parsed.data.courseMasterId ?? existing.course_master_id
    let nextPricingBatchId =
      parsed.data.courseMasterBatchId !== undefined
        ? parsed.data.courseMasterBatchId
        : existing.course_master_batch_id

    if (
      parsed.data.courseMasterId != null &&
      parsed.data.courseMasterId !== existing.course_master_id &&
      parsed.data.courseMasterBatchId === undefined
    ) {
      nextPricingBatchId = null
    }

    if (nextPricingBatchId) {
      const pricingOk = await assertPricingBatchForCourse(nextPricingBatchId, nextCourseId)
      if (!pricingOk) {
        return badRequest('Pricing batch must belong to the selected course')
      }
    }

    try {
      const batch = await updateBatch(batchId, existing.center_id, {
        courseMasterId: parsed.data.courseMasterId,
        name: parsed.data.name,
        code: parsed.data.code,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        status: parsed.data.status,
        capacity: parsed.data.capacity,
        facultyEmployeeId: parsed.data.facultyEmployeeId,
        courseMasterBatchId: nextPricingBatchId,
        notes: parsed.data.notes,
      })
      if (!batch) return notFound('Batch not found')

      await logActivity(
        {
          user_type: 'super_admin',
          user_id: perm.adminId,
          center_id: batch.center_id,
          action: 'update',
          entity_type: 'course_batch',
          entity_id: batch.id,
          entity_name: batch.name,
        },
        request
      )
      return NextResponse.json({ batch })
    } catch (error) {
      if (isUniqueViolation(error)) return conflict(uniqueViolationMessage(error))
      throw error
    }
  } catch (error) {
    return serverError('sa-batches-update', error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const perm = await requireSuperAdminPermission(request, 'batches', 'delete')
    if (!perm.ok) return perm.response

    const batchId = Number(params.id)
    if (!Number.isInteger(batchId) || batchId <= 0) return badRequest('Invalid batch id')

    const existing = await getBatchById(batchId)
    if (!existing) return notFound('Batch not found')

    const deleted = await deleteBatch(batchId)
    if (!deleted) return notFound('Batch not found')

    await logActivity(
      {
        user_type: 'super_admin',
        user_id: perm.adminId,
        center_id: existing.center_id,
        action: 'delete',
        entity_type: 'course_batch',
        entity_id: batchId,
        entity_name: existing.name,
      },
      request
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    return serverError('sa-batches-delete', error)
  }
}
