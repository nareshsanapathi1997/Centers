import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { buildHeaderMenuTree } from '@/lib/headerMenuTree'
import { revalidateWebsiteHomeChrome } from '@/lib/website-home-revalidate'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT * FROM website_header_menu_items ORDER BY display_order, id'
    )
    return NextResponse.json(buildHeaderMenuTree(result.rows))
  } catch (error) {
    console.error('website header menu GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await request.json()
    if (!body.menu_key?.trim() || !body.title?.trim()) {
      return NextResponse.json({ error: 'menu_key and title are required' }, { status: 400 })
    }

    const existing = await pool.query(
      'SELECT id FROM website_header_menu_items WHERE menu_key = $1 LIMIT 1',
      [body.menu_key.trim()]
    )
    if (existing.rows[0]) {
      return NextResponse.json({ error: 'menu_key already exists — use a unique key' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO website_header_menu_items
       (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        body.menu_key.trim(),
        body.parent_id || null,
        body.title.trim(),
        body.icon_class?.trim() || null,
        body.link_url?.trim() || null,
        body.target_section?.trim() || null,
        Number(body.display_order) || 0,
        body.is_active !== false,
      ]
    )
    revalidateWebsiteHomeChrome()
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('website header menu POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await request.json()
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const setClauses: string[] = []
    const values: unknown[] = []
    const addSet = (column: string, value: unknown) => {
      values.push(value)
      setClauses.push(`${column} = $${values.length}`)
    }

    if ('title' in body && body.title?.trim()) addSet('title', body.title.trim())
    if ('icon_class' in body) addSet('icon_class', body.icon_class?.trim() || null)
    if ('link_url' in body) addSet('link_url', body.link_url?.trim() || null)
    if ('target_section' in body) addSet('target_section', body.target_section?.trim() || null)
    if ('display_order' in body && body.display_order != null) {
      addSet('display_order', Number(body.display_order) || 0)
    }
    if ('is_active' in body && typeof body.is_active === 'boolean') addSet('is_active', body.is_active)
    if ('parent_id' in body) addSet('parent_id', body.parent_id || null)

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP')
    values.push(body.id)

    const result = await pool.query(
      `UPDATE website_header_menu_items SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    revalidateWebsiteHomeChrome()
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('website header menu PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
