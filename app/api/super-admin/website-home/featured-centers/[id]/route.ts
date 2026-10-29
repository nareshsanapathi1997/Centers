import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { revalidateWebsiteHomeContent } from '@/lib/website-home-revalidate'

export const dynamic = 'force-dynamic'

type RouteParams = { params: { id: string } }

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await verifySuperAdminAuth(_request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  try {
    await pool.query('DELETE FROM website_featured_centers WHERE id = $1', [Number(params.id)])
    revalidateWebsiteHomeContent()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('website featured centers DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const result = await pool.query(
      `UPDATE website_featured_centers
       SET display_order = COALESCE($2, display_order), updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [Number(params.id), body.display_order ?? null]
    )
    revalidateWebsiteHomeContent()
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('website featured centers PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
