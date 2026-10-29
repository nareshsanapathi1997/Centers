import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import {
  getBatchCenterFee,
  getCenterFee,
  isCourseAssignedToCenter,
  listCourseBatchesWithFees,
  upsertBatchCenterFee,
} from '@/lib/course-fees-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })

    const centerId = Number(request.nextUrl.searchParams.get('centerId'))
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, centerId, 'course_fees', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const batchId = request.nextUrl.searchParams.get('batchId')
    if (batchId) {
      const fee = await getBatchCenterFee(Number(batchId), centerId)
      return NextResponse.json(fee)
    }

    const courseMasterId = Number(request.nextUrl.searchParams.get('courseMasterId'))
    if (!courseMasterId) {
      return NextResponse.json({ error: 'courseMasterId is required' }, { status: 400 })
    }

    const assigned = await isCourseAssignedToCenter(courseMasterId, centerId)
    if (!assigned) {
      return NextResponse.json({ error: 'Course not assigned to this center' }, { status: 403 })
    }

    const batches = await listCourseBatchesWithFees(courseMasterId, centerId)
    const courseCenterFee = await getCenterFee(courseMasterId, centerId)
    return NextResponse.json({
      batches,
      course_has_center_fee: !!(courseCenterFee && ['saved', 'approved'].includes(courseCenterFee.status)),
    })
  } catch (error) {
    console.error('Error fetching center course batches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })

    const body = await request.json()
    const centerId = Number(body.center_id)
    const courseMasterId = Number(body.course_master_id)
    const batchId = Number(body.batch_id)
    if (!centerId || !courseMasterId || !batchId) {
      return NextResponse.json(
        { error: 'center_id, course_master_id, and batch_id are required' },
        { status: 400 }
      )
    }

    const perm = await requireAdminPermission(token, centerId, 'course_fees', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const assigned = await isCourseAssignedToCenter(courseMasterId, centerId)
    if (!assigned) {
      return NextResponse.json({ error: 'Course not assigned to this center' }, { status: 403 })
    }

    const saved = await upsertBatchCenterFee(batchId, courseMasterId, centerId, {
      ...body,
      configured_by: body.configured_by || 'center',
      status: body.status || 'saved',
    })
    return NextResponse.json(saved)
  } catch (error) {
    console.error('Error saving batch center fee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
