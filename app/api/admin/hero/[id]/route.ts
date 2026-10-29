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
    const result = await pool.query('SELECT * FROM hero_slides WHERE id = $1', [id])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Hero slide not found' }, { status: 404 })
    }
    
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching hero slide:', error)
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
    const existingItem = await pool.query('SELECT center_id, title FROM hero_slides WHERE id = $1', [id])
    if (existingItem.rows.length === 0) {
      return NextResponse.json({ error: 'Hero slide not found' }, { status: 404 })
    }

    const centerId = existingItem.rows[0].center_id
    const perm = await requireAdminPermission(token, centerId, 'hero', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const body = await request.json()
    const { title, slider_image_url, button_link, display_order, is_active } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!slider_image_url?.trim()) {
      return NextResponse.json({ error: 'Banner image is required' }, { status: 400 })
    }

    if (button_link?.trim()) {
      try {
        const url = new URL(button_link.trim())
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return NextResponse.json({ error: 'Banner link must be a valid http or https URL' }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'Banner link must be a valid http or https URL' }, { status: 400 })
      }
    }

    const approvalStatus = await resolveApprovalStatus('hero')

    const result = await pool.query(
      `UPDATE hero_slides 
       SET title = $1, slider_image_url = $2, button_link = $3, 
           show_content = false, display_order = $4, is_active = $5, approval_status = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [title, slider_image_url, button_link || null, display_order || 0, is_active !== false, approvalStatus, id]
    )

    const updated = result.rows[0]
    if (updated?.center_id && approvalStatus === 'pending') {
      await applyApprovalWorkflow({
        sectionKey: 'hero',
        title: updated.title || 'Hero Slide',
        centerId: updated.center_id,
      })
    }

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'update',
        entity_type: 'hero',
        entity_id: id,
        entity_name: title || existingItem.rows[0].title,
        details: body,
      },
      request
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating hero slide:', error)
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
    const existingItem = await pool.query('SELECT center_id, title FROM hero_slides WHERE id = $1', [id])
    if (existingItem.rows.length === 0) {
      return NextResponse.json({ error: 'Hero slide not found' }, { status: 404 })
    }

    const centerId = existingItem.rows[0].center_id
    const title = existingItem.rows[0].title
    const perm = await requireAdminPermission(token, centerId, 'hero', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    await pool.query('DELETE FROM hero_slides WHERE id = $1', [id])

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'delete',
        entity_type: 'hero',
        entity_id: id,
        entity_name: title || 'Hero Slide',
      },
      request
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting hero slide:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

