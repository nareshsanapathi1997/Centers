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
    const result = await pool.query('SELECT * FROM result_images WHERE id = $1', [id])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Result image not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching result image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const id = parseInt(params.id)
    
    // Get existing item to get center_id
    const existingItem = await pool.query('SELECT center_id, title FROM result_images WHERE id = $1', [id])
    if (existingItem.rows.length === 0) {
      return NextResponse.json({ error: 'Result image not found' }, { status: 404 })
    }

    const centerId = existingItem.rows[0].center_id
    const perm = await requireAdminPermission(token, centerId, 'results', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const body = await request.json()
    const { title, image_url, display_order, is_active } = body

    const result = await pool.query(
      `UPDATE result_images 
       SET title = $1, image_url = $2, display_order = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [title, image_url, display_order || 0, is_active !== false, id]
    )

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'update',
        entity_type: 'result',
        entity_id: id,
        entity_name: title || existingItem.rows[0].title,
        details: body,
      },
      request
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating result image:', error)
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
    
    // Get existing item to get center_id and title
    const existingItem = await pool.query('SELECT center_id, title FROM result_images WHERE id = $1', [id])
    if (existingItem.rows.length === 0) {
      return NextResponse.json({ error: 'Result image not found' }, { status: 404 })
    }

    const centerId = existingItem.rows[0].center_id
    const title = existingItem.rows[0].title
    const perm = await requireAdminPermission(token, centerId, 'results', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    await pool.query('DELETE FROM result_images WHERE id = $1', [id])

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'delete',
        entity_type: 'result',
        entity_id: id,
        entity_name: title,
      },
      request
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting result image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

