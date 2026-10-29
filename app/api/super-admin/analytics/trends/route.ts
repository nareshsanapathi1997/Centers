import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { parseAnalyticsDays, queryAnalyticsTrends } from '@/lib/analytics-queries'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const days = parseAnalyticsDays(new URL(request.url).searchParams.get('days'))
    const dailyTrends = await queryAnalyticsTrends(days)
    return NextResponse.json({ dailyTrends })
  } catch (error) {
    console.error('Error fetching analytics trends:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
