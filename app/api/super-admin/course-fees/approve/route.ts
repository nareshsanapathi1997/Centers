import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const courseMasterId = Number(body.course_master_id)
    const centerId = Number(body.center_id)
    if (!courseMasterId || !centerId) {
      return NextResponse.json({ error: 'course_master_id and center_id required' }, { status: 400 })
    }

    await pool.query(
      `UPDATE course_center_fees SET status = 'approved', approved_at = NOW(), updated_at = NOW()
       WHERE course_master_id = $1 AND center_id = $2`,
      [courseMasterId, centerId]
    )

    await pool.query(
      `UPDATE course_batch_center_fees SET status = 'approved', approved_at = NOW(), updated_at = NOW()
       WHERE course_master_id = $1 AND center_id = $2`,
      [courseMasterId, centerId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Approve center fee error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
