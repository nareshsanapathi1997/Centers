import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { revalidateWebsiteHomeChrome } from '@/lib/website-home-revalidate'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT * FROM website_main_nav_items ORDER BY display_order, id'
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('website main nav GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 401 })

  try {
    const body = await request.json()
    if (!body.label?.trim() || !body.href?.trim()) {
      return NextResponse.json({ error: 'Label and href are required' }, { status: 400 })
    }
    const result = await pool.query(
      `INSERT INTO website_main_nav_items (label, href, display_order, is_active)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [body.label.trim(), body.href.trim(), Number(body.display_order) || 0, body.is_active !== false]
    )
    revalidateWebsiteHomeChrome()
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('website main nav POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
