import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { revalidateWebsiteHomeChrome } from '@/lib/website-home-revalidate'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await request.json()
    const result = await pool.query(
      `UPDATE website_main_nav_items
       SET label = COALESCE($2, label),
           href = COALESCE($3, href),
           display_order = COALESCE($4, display_order),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [
        Number(params.id),
        body.label?.trim() || null,
        body.href?.trim() || null,
        body.display_order != null ? Number(body.display_order) : null,
        typeof body.is_active === 'boolean' ? body.is_active : null,
      ]
    )
    revalidateWebsiteHomeChrome()
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('website main nav PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await verifySuperAdminAuth(_request)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  await pool.query('DELETE FROM website_main_nav_items WHERE id = $1', [Number(params.id)])
  revalidateWebsiteHomeChrome()
  return NextResponse.json({ success: true })
}
