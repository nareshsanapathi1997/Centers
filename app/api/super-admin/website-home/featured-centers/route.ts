import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { revalidateWebsiteHomeContent } from '@/lib/website-home-revalidate'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT wfc.*, c.name AS center_name, c.slug AS center_slug
       FROM website_featured_centers wfc
       JOIN centers c ON c.id = wfc.center_id
       ORDER BY wfc.display_order, wfc.id`
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('website featured centers GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const centerId = Number(body.center_id)
    if (!Number.isFinite(centerId)) {
      return NextResponse.json({ error: 'center_id is required' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO website_featured_centers (center_id, display_order)
       VALUES ($1, $2)
       ON CONFLICT (center_id) DO UPDATE SET display_order = EXCLUDED.display_order, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [centerId, Number(body.display_order) || 0]
    )

    revalidateWebsiteHomeContent()
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('website featured centers POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
