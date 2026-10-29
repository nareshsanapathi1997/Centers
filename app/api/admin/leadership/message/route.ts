import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/** Update the shared leadership message for all directors at a center. */
export async function PATCH(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const body = await request.json()
    const { center_id, message_title, message_content } = body

    if (!center_id) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, parseInt(center_id), 'leadership', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const result = await pool.query(
      `UPDATE leadership
       SET message_title = $1, message_content = $2, updated_at = CURRENT_TIMESTAMP
       WHERE center_id = $3
       RETURNING *`,
      [message_title || null, message_content || null, center_id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Add at least one center director before saving the message.' },
        { status: 400 }
      )
    }

    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: parseInt(center_id),
        action: 'update',
        entity_type: 'leadership',
        entity_name: 'Shared leadership message',
        details: { message_title, message_content },
      },
      request
    )

    return NextResponse.json({
      message_title: message_title || null,
      message_content: message_content || null,
      updated: result.rowCount,
    })
  } catch (error) {
    console.error('Error updating shared leadership message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
