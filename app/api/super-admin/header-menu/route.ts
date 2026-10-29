import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { buildHeaderMenuTree } from '@/lib/headerMenuTree'
import { verifySuperAdminAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin(request: NextRequest) {
  const auth = await verifySuperAdminAccess(request)
  if (!auth.isValid) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }
  return null
}

// Get all header menu items with hierarchy
export async function GET(request: NextRequest) {
  const denied = await requireSuperAdmin(request)
  if (denied) return denied

  try {
    const result = await pool.query(
      'SELECT * FROM header_menu_items ORDER BY display_order'
    )
    return NextResponse.json(buildHeaderMenuTree(result.rows))
  } catch (error) {
    console.error('Error fetching header menu items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create a new header menu item
export async function POST(request: NextRequest) {
  const denied = await requireSuperAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json()
    const { menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active } = body

    if (!menu_key || !title) {
      return NextResponse.json({ error: 'Menu key and title are required' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO header_menu_items (menu_key, parent_id, title, icon_class, link_url, target_section, display_order, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [menu_key, parent_id || null, title, icon_class || null, link_url || null, target_section || null, display_order || 0, is_active !== false]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Error creating header menu item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update header menu item — only updates fields present in the request body,
// so toggling is_active alone never wipes link_url / target_section.
export async function PUT(request: NextRequest) {
  const denied = await requireSuperAdmin(request)
  if (denied) return denied

  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Menu item ID is required' }, { status: 400 })
    }

    const setClauses: string[] = []
    const values: unknown[] = []
    const addSet = (column: string, value: unknown) => {
      values.push(value)
      setClauses.push(`${column} = $${values.length}`)
    }

    if ('title' in body && body.title) addSet('title', body.title)
    if ('icon_class' in body) addSet('icon_class', body.icon_class || null)
    if ('link_url' in body) addSet('link_url', body.link_url || null)
    if ('target_section' in body) addSet('target_section', body.target_section || null)
    if ('display_order' in body && body.display_order != null) addSet('display_order', body.display_order)
    if ('is_active' in body && typeof body.is_active === 'boolean') addSet('is_active', body.is_active)
    if ('parent_id' in body && body.parent_id != null) addSet('parent_id', body.parent_id)

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const result = await pool.query(
      `UPDATE header_menu_items SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating header menu item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete header menu item (children are removed too via ON DELETE CASCADE)
export async function DELETE(request: NextRequest) {
  const denied = await requireSuperAdmin(request)
  if (denied) return denied

  try {
    const { searchParams } = new URL(request.url)
    const id = Number(searchParams.get('id'))

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Menu item ID is required' }, { status: 400 })
    }

    const result = await pool.query(
      'DELETE FROM header_menu_items WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: result.rows[0].id })
  } catch (error) {
    console.error('Error deleting header menu item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
