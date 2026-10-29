import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { getActivityLogs } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get('centerId')
    const userId = searchParams.get('userId')
    const userType = searchParams.get('userType') as 'admin' | 'super_admin' | undefined
    const action = searchParams.get('action') || undefined
    const entityType = searchParams.get('entityType') || undefined

    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const logs = await getActivityLogs({
      user_type: userType,
      user_id: userId ? parseInt(userId) : undefined,
      center_id: centerId ? parseInt(centerId) : undefined,
      action,
      entity_type: entityType,
      limit,
      offset,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
