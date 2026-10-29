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
    const result = await pool.query('SELECT * FROM senior_faculty WHERE id = $1', [
      params.id,
    ])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Senior faculty not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching senior faculty:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, role, description, image_url, display_order, is_active } = body

    const result = await pool.query(
      `UPDATE senior_faculty 
       SET name = $1, role = $2, description = $3, image_url = $4, display_order = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        name,
        role,
        description || null,
        image_url || null,
        display_order || 0,
        is_active !== undefined ? is_active : true,
        params.id,
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Senior faculty not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating senior faculty:', error)
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
    
    // Get existing item to get center_id and name
    const existingItem = await pool.query('SELECT center_id, name FROM senior_faculty WHERE id = $1', [id])
    if (existingItem.rows.length === 0) {
      return NextResponse.json({ error: 'Senior faculty not found' }, { status: 404 })
    }

    const centerId = existingItem.rows[0].center_id
    const name = existingItem.rows[0].name
    const perm = await requireAdminPermission(token, centerId, 'senior_faculty', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const result = await pool.query('DELETE FROM senior_faculty WHERE id = $1 RETURNING *', [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Senior faculty not found' }, { status: 404 })
    }

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'delete',
        entity_type: 'senior_faculty',
        entity_id: id,
        entity_name: name,
      },
      request
    )

    return NextResponse.json({ message: 'Senior faculty deleted successfully' })
  } catch (error) {
    console.error('Error deleting senior faculty:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
