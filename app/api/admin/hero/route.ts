import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'
import { applyApprovalWorkflow, resolveApprovalStatus } from '@/lib/approval-settings'
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

    const perm = await requireAdminPermission(token, centerId, 'hero', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const result = await pool.query(
      'SELECT * FROM hero_slides WHERE center_id = $1 ORDER BY display_order',
      [centerId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching hero slides:', error)
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
    const { center_id, title, slider_image_url, button_link, display_order, is_active } = body

    if (!slider_image_url) {
      return NextResponse.json({ error: 'Banner image is required' }, { status: 400 })
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
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

    if (!center_id) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, parseInt(center_id), 'hero', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const approvalStatus = await applyApprovalWorkflow({
      sectionKey: 'hero',
      title: title || 'Hero Slide',
      centerId: parseInt(center_id),
    })

    const result = await pool.query(
      `INSERT INTO hero_slides (center_id, title, slider_image_url, button_link, show_content, display_order, is_active, approval_status)
       VALUES ($1, $2, $3, $4, false, $5, $6, $7)
       RETURNING *`,
      [center_id, title, slider_image_url, button_link || null, display_order || 0, is_active !== false, approvalStatus]
    )

    const newSlide = result.rows[0]

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: parseInt(center_id),
        action: 'create',
        entity_type: 'hero',
        entity_id: newSlide.id,
        entity_name: title || 'Hero Slide',
      },
      request
    )

    return NextResponse.json(newSlide)
  } catch (error) {
    console.error('Error creating hero slide:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

