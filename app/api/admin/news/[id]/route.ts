import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'
import { applyApprovalWorkflow, resolveApprovalStatus } from '@/lib/approval-settings'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    const result = await pool.query('SELECT * FROM news_items WHERE id = $1', [id])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'News item not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching news item:', error)
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
    const { title, content, link_url, is_new, is_notification, display_order, is_active } = body

    const existing = await pool.query('SELECT center_id, title FROM news_items WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'News item not found' }, { status: 404 })
    }

    const approvalStatus = await resolveApprovalStatus('news')

    const result = await pool.query(
      `UPDATE news_items 
       SET title = $1, content = $2, link_url = $3, is_new = $4, is_notification = $5, 
           display_order = $6, is_active = $7, approval_status = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [title, content || null, link_url || null, is_new || false, is_notification || false, display_order || 0, is_active !== false, approvalStatus, id]
    )

    const updated = result.rows[0]
    if (updated?.center_id && approvalStatus === 'pending') {
      await applyApprovalWorkflow({
        sectionKey: 'news',
        title: updated.title,
        centerId: updated.center_id,
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating news item:', error)
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
    const existingItem = await pool.query('SELECT center_id, title FROM news_items WHERE id = $1', [id])
    if (existingItem.rows.length === 0) {
      return NextResponse.json({ error: 'News item not found' }, { status: 404 })
    }

    const centerId = existingItem.rows[0].center_id
    const title = existingItem.rows[0].title
    const perm = await requireAdminPermission(token, centerId, 'news', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    await pool.query('DELETE FROM news_items WHERE id = $1', [id])

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'delete',
        entity_type: 'news',
        entity_id: id,
        entity_name: title,
      },
      request
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting news item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

