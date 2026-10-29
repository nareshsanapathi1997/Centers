import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const result = await pool.query('SELECT * FROM text_testimonials WHERE id = $1', [id])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Text testimonial not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching text testimonial:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const body = await request.json()
    const { quote, author_name, author_role, display_order, is_active } = body

    const result = await pool.query(
      `UPDATE text_testimonials 
       SET quote = $1, author_name = $2, author_role = $3, display_order = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [quote, author_name, author_role || null, display_order || 0, is_active !== false, id]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating text testimonial:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const id = parseInt(params.id)
    
    // Get existing item to get center_id and author_name
    const existingItem = await pool.query('SELECT center_id, author_name FROM text_testimonials WHERE id = $1', [id])
    if (existingItem.rows.length === 0) {
      return NextResponse.json({ error: 'Text testimonial not found' }, { status: 404 })
    }

    const centerId = existingItem.rows[0].center_id
    const authorName = existingItem.rows[0].author_name
    const perm = await requireAdminPermission(token, centerId, 'testimonials', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    await pool.query('DELETE FROM text_testimonials WHERE id = $1', [id])

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'delete',
        entity_type: 'testimonial_text',
        entity_id: id,
        entity_name: authorName || 'Testimonial',
      },
      request
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting text testimonial:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

