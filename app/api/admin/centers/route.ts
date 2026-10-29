import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken, verifyAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Returns only the center the caller is an admin of. This used to list every
 * active center, which exposed the full tenant list (names, slugs, contact
 * details) to any authenticated center admin.
 */
export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    const decoded = token ? verifyAdminToken(token) : null
    if (!decoded?.centerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await pool.query(
      'SELECT * FROM centers WHERE id = $1 AND is_active = true ORDER BY name',
      [decoded.centerId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching centers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
