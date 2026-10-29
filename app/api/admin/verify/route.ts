import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAccess, getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { centerId } = await request.json()

    if (!centerId) {
      console.error('Verify: centerId is required')
      return NextResponse.json({ authorized: false, error: 'centerId is required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) {
      console.error('Verify: No token provided')
      return NextResponse.json({ authorized: false, error: 'No token provided' }, { status: 401 })
    }

    console.log('Verify: Verifying admin access for centerId:', centerId)
    const result = await verifyAdminAccess(token, parseInt(centerId))
    
    console.log('Verify: Result:', result)
    
    if (!result.authorized) {
      console.error('Verify: Not authorized:', result.error)
      return NextResponse.json(
        { authorized: false, error: result.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    console.log('Verify: Authorized successfully')
    return NextResponse.json({ authorized: true, adminId: result.adminId })
  } catch (error) {
    console.error('Error verifying admin:', error)
    return NextResponse.json({ authorized: false, error: 'Internal server error' }, { status: 500 })
  }
}
