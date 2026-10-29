import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { revalidateWebsiteHomeChrome } from '@/lib/website-home-revalidate'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT * FROM website_footer_menu_items ORDER BY menu_group, display_order, id'
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('website footer menu GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await request.json()
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    const result = await pool.query(
      `INSERT INTO website_footer_menu_items
       (menu_group, group_title, title, icon_class, link_url, target_section, display_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        body.menu_group || 'quick_links_1',
        body.group_title || null,
        body.title.trim(),
        body.icon_class || 'ri-arrow-right-s-line',
        body.link_url || null,
        body.target_section || null,
        Number(body.display_order) || 0,
        body.is_active !== false,
      ]
    )
    revalidateWebsiteHomeChrome()
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('website footer menu POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const result = await pool.query(
      `UPDATE website_footer_menu_items SET
         menu_group = COALESCE($2, menu_group),
         group_title = COALESCE($3, group_title),
         title = COALESCE($4, title),
         icon_class = COALESCE($5, icon_class),
         link_url = COALESCE($6, link_url),
         target_section = COALESCE($7, target_section),
         display_order = COALESCE($8, display_order),
         is_active = COALESCE($9, is_active),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [
        body.id,
        body.menu_group || null,
        body.group_title ?? null,
        body.title || null,
        body.icon_class ?? null,
        body.link_url ?? null,
        body.target_section ?? null,
        body.display_order ?? null,
        typeof body.is_active === 'boolean' ? body.is_active : null,
      ]
    )
    revalidateWebsiteHomeChrome()
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('website footer menu PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
