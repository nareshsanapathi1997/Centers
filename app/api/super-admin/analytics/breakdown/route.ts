import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { parseAnalyticsDays, queryAnalyticsBreakdown } from '@/lib/analytics-queries'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseAnalyticsDays(searchParams.get('days'))
    const centerIdRaw = searchParams.get('centerId')
    const centerId = centerIdRaw ? parseInt(centerIdRaw, 10) : undefined

    const detailedBreakdown = await queryAnalyticsBreakdown(
      days,
      centerId && !Number.isNaN(centerId) ? centerId : undefined,
    )

    return NextResponse.json({ detailedBreakdown })
  } catch (error) {
    console.error('Error fetching analytics breakdown:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
