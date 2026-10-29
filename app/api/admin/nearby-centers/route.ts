import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifyAdminAccess, getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET - Get nearby centers for the admin's center
export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract centerId from token
    const { verifyAdminToken } = await import('@/lib/auth')
    const payload = verifyAdminToken(token)
    
    if (!payload || !payload.centerId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const centerId = payload.centerId

    // Verify admin access
    const authResult = await verifyAdminAccess(token, centerId)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    // Fetch nearby centers for this center
    const result = await pool.query(
      `SELECT c.*, nc.display_order
       FROM centers c
       INNER JOIN nearby_centers nc ON c.id = nc.nearby_center_id
       WHERE nc.center_id = $1
       ORDER BY nc.display_order, c.name`,
      [centerId]
    )

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Error fetching nearby centers:', error)
    // If table doesn't exist yet, return empty array
    if (error.code === '42P01') {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
