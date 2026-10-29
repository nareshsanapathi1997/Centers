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
    const result = await pool.query('SELECT * FROM leadership WHERE id = $1', [params.id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Leadership entry not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching leadership entry:', error)
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
    const existingItem = await pool.query('SELECT center_id, name FROM leadership WHERE id = $1', [id])
    if (existingItem.rows.length === 0) {
      return NextResponse.json({ error: 'Leadership entry not found' }, { status: 404 })
    }

    const centerId = existingItem.rows[0].center_id
    const perm = await requireAdminPermission(token, centerId, 'leadership', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const body = await request.json()
    const { name, role, image_url, bio, display_order, is_active } = body

    const result = await pool.query(
      `UPDATE leadership
       SET name = $1, role = $2, image_url = $3, bio = $4, display_order = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        name,
        role,
        image_url || null,
        bio || null,
        display_order ?? 0,
        is_active !== false,
        id,
      ]
    )

    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'update',
        entity_type: 'leadership',
        entity_id: id,
        entity_name: name || existingItem.rows[0].name,
        details: body,
      },
      request
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating leadership entry:', error)
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
    const existingItem = await pool.query('SELECT center_id, name FROM leadership WHERE id = $1', [id])
    if (existingItem.rows.length === 0) {
      return NextResponse.json({ error: 'Leadership entry not found' }, { status: 404 })
    }

    const centerId = existingItem.rows[0].center_id
    const name = existingItem.rows[0].name

    const perm = await requireAdminPermission(token, centerId, 'leadership', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    await pool.query('DELETE FROM leadership WHERE id = $1', [id])

    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'delete',
        entity_type: 'leadership',
        entity_id: id,
        entity_name: name,
      },
      request
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting leadership entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
