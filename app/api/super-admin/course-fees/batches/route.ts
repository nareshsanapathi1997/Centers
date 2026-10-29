import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import {
  getBaseFeeByCourseId,
  getBatchBaseFee,
  listCourseBatchesWithFees,
  upsertBatchBaseFee,
} from '@/lib/course-fees-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const batchId = request.nextUrl.searchParams.get('batchId')
    if (batchId) {
      const fee = await getBatchBaseFee(Number(batchId))
      if (!fee) return NextResponse.json(null)
      return NextResponse.json(fee)
    }

    const courseMasterId = Number(request.nextUrl.searchParams.get('courseMasterId'))
    if (!courseMasterId) {
      return NextResponse.json({ error: 'courseMasterId is required' }, { status: 400 })
    }

    const batches = await listCourseBatchesWithFees(courseMasterId)
    const courseBaseFee = await getBaseFeeByCourseId(courseMasterId)
    return NextResponse.json({ batches, course_has_base_fee: !!courseBaseFee })
  } catch (error) {
    console.error('Error fetching course batches:', error)
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
    const batchId = Number(body.batch_id)
    const courseMasterId = Number(body.course_master_id)
    if (!batchId || !courseMasterId) {
      return NextResponse.json({ error: 'batch_id and course_master_id are required' }, { status: 400 })
    }

    const saved = await upsertBatchBaseFee(batchId, courseMasterId, body)
    return NextResponse.json(saved, { status: 201 })
  } catch (error) {
    console.error('Error saving batch base fee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  return GET(request)
}
