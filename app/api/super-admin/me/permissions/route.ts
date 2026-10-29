import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { getSuperAdminAccessProfile } from '@/lib/super-admin-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized || !authResult.adminId) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const profile = await getSuperAdminAccessProfile(authResult.adminId)

    return NextResponse.json({
      fullAccess: profile.fullAccess,
      roleId: profile.roleId,
      roleName: profile.roleName,
      grants: profile.grants,
    })
  } catch (error) {
    console.error('Error fetching super admin access profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
