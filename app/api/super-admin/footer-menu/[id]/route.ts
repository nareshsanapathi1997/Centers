import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'

export const dynamic = 'force-dynamic'

// Update a footer menu item
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const body = await request.json()
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (body.menu_group !== undefined) {
      updates.push(`menu_group = $${paramCount++}`)
      values.push(body.menu_group)
    }
    if (body.title !== undefined) {
      updates.push(`title = $${paramCount++}`)
      values.push(body.title)
    }
    if (body.icon_class !== undefined) {
      updates.push(`icon_class = $${paramCount++}`)
      values.push(body.icon_class || null)
    }
    if (body.link_url !== undefined) {
      updates.push(`link_url = $${paramCount++}`)
      values.push(body.link_url || null)
    }
    if (body.target_section !== undefined) {
      updates.push(`target_section = $${paramCount++}`)
      values.push(body.target_section || null)
    }
    if (body.display_order !== undefined) {
      updates.push(`display_order = $${paramCount++}`)
      values.push(body.display_order)
    }
    if (body.is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`)
      values.push(body.is_active)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const result = await pool.query(
      `UPDATE footer_menu_items 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Footer menu item not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Error updating footer menu item:', error)
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Footer menu items table does not exist. Please run migration.' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a footer menu item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    await pool.query('DELETE FROM footer_menu_items WHERE id = $1', [id])

    return NextResponse.json({ message: 'Footer menu item deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting footer menu item:', error)
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Footer menu items table does not exist. Please run migration.' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
