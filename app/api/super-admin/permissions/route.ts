import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { listSuperAdminPermissions } from '@/lib/super-admin-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const permissions = await listSuperAdminPermissions()
    return NextResponse.json(permissions)
  } catch (error) {
    console.error('Error fetching super admin permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
