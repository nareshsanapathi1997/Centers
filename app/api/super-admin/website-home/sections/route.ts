import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { revalidateWebsiteHomeContent } from '@/lib/website-home-revalidate'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT * FROM website_section_configs ORDER BY display_order, id'
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('website sections GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const id = Number(body.id)
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE website_section_configs
       SET is_enabled = COALESCE($2, is_enabled),
           display_order = COALESCE($3, display_order),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, body.is_enabled, body.display_order ?? null]
    )

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    revalidateWebsiteHomeContent()
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('website sections PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
