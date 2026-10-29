import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'
import { applyApprovalWorkflow } from '@/lib/approval-settings'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const centerId = parseInt(searchParams.get('centerId') || '0')

    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'news', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const result = await pool.query(
      'SELECT * FROM news_items WHERE center_id = $1 ORDER BY display_order, created_at DESC',
      [centerId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching news items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const body = await request.json()
    const { center_id, title, content, link_url, is_new, is_notification, display_order, is_active } = body

    if (!center_id) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, parseInt(center_id), 'news', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const approvalStatus = await applyApprovalWorkflow({
      sectionKey: 'news',
      title,
      centerId: parseInt(center_id),
    })

    const result = await pool.query(
      `INSERT INTO news_items (center_id, title, content, link_url, is_new, is_notification, display_order, is_active, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [center_id, title, content || null, link_url || null, is_new || false, is_notification || false, display_order || 0, is_active !== false, approvalStatus]
    )

    const newItem = result.rows[0]

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: parseInt(center_id),
        action: 'create',
        entity_type: 'news',
        entity_id: newItem.id,
        entity_name: title,
      },
      request
    )

    return NextResponse.json(newItem)
  } catch (error) {
    console.error('Error creating news item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

