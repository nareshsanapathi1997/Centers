import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'

export const dynamic = 'force-dynamic'

// Get all footer menu items (public read access, like header-menu)
export async function GET(request: NextRequest) {
  try {
    const result = await pool.query(
      'SELECT * FROM footer_menu_items ORDER BY menu_group, display_order'
    )
    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Error fetching footer menu items:', error)
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Footer menu items table does not exist. Please run migration.' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create a new footer menu item
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { menu_group, title, icon_class, link_url, target_section, display_order, is_active } = body

    if (!menu_group || !title) {
      return NextResponse.json({ error: 'Menu group and title are required' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO footer_menu_items (menu_group, title, icon_class, link_url, target_section, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        menu_group,
        title,
        icon_class || null,
        link_url || null,
        target_section || null,
        display_order || 0,
        is_active !== false
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    console.error('Error creating footer menu item:', error)
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Footer menu items table does not exist. Please run migration.' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
