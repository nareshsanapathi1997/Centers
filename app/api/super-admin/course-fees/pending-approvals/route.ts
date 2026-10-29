import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { listPendingFeeApprovals } from '@/lib/course-fees-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const rows = await listPendingFeeApprovals()
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Pending approvals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
