import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import {
  parseAnalyticsDays,
  queryAnalyticsOverview,
  queryCenterSpecificCounts,
  queryAnalyticsTops,
  queryAnalyticsTrends,
  queryAnalyticsBreakdown,
} from '@/lib/analytics-queries'

export const dynamic = 'force-dynamic'

/** Legacy combined endpoint — prefer split routes under /analytics/* */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseAnalyticsDays(searchParams.get('days'))
    const centerId = searchParams.get('centerId')

    const [{ overall, centers }, tops, dailyTrends, detailedBreakdown] = await Promise.all([
      queryAnalyticsOverview(days),
      queryAnalyticsTops(days),
      queryAnalyticsTrends(days),
      queryAnalyticsBreakdown(days, centerId ? parseInt(centerId, 10) : undefined),
    ])

    let centerSpecific = null
    if (centerId) {
      centerSpecific = await queryCenterSpecificCounts(parseInt(centerId, 10))
    }

    return NextResponse.json({
      overall,
      centers,
      centerSpecific,
      ...tops,
      dailyTrends,
      detailedBreakdown,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
