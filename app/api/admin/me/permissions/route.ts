import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken, verifyAdminAccess } from '@/lib/auth'
import { getAdminAccessProfile } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const authResult = await verifyAdminAccess(token, centerId)
    if (!authResult.authorized || !authResult.adminId) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const profile = await getAdminAccessProfile(authResult.adminId, centerId)

    return NextResponse.json({
      fullAccess: profile.fullAccess,
      roleIds: profile.roleIds,
      roleNames: profile.roleNames,
      grants: profile.grants,
    })
  } catch (error) {
    console.error('Error fetching admin access profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
