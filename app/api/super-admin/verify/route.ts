import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const result = await verifySuperAdminAccess(request)

    if (!result.isValid) {
      const status =
        result.error === 'No token provided' || result.error === 'Invalid token'
          ? 401
          : result.error === 'Session expired or revoked'
            ? 401
            : 403

      return NextResponse.json(
        { authorized: false, error: result.error || 'Unauthorized' },
        { status }
      )
    }

    return NextResponse.json({ authorized: true, adminId: result.adminId })
  } catch (error) {
    console.error('Error verifying super admin:', error)
    return NextResponse.json({ authorized: false, error: 'Internal server error' }, { status: 500 })
  }
}
