import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'
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

    const perm = await requireAdminPermission(token, centerId, 'leadership', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const result = await pool.query(
      'SELECT * FROM leadership WHERE center_id = $1 ORDER BY display_order, created_at',
      [centerId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching leadership:', error)
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
    const {
      center_id,
      name,
      role,
      image_url,
      message_title,
      message_content,
      bio,
      display_order,
      is_active,
    } = body

    if (!center_id) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    if (!name || !role) {
      return NextResponse.json({ error: 'Name and role are required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, parseInt(center_id), 'leadership', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    // New directors inherit the center's shared message from existing rows
    let sharedTitle = message_title ?? null
    let sharedContent = message_content ?? null
    if (sharedTitle == null && sharedContent == null) {
      const existing = await pool.query(
        'SELECT message_title, message_content FROM leadership WHERE center_id = $1 ORDER BY display_order, created_at LIMIT 1',
        [center_id]
      )
      if (existing.rows[0]) {
        sharedTitle = existing.rows[0].message_title
        sharedContent = existing.rows[0].message_content
      }
    }

    const result = await pool.query(
      `INSERT INTO leadership (center_id, name, role, image_url, message_title, message_content, bio, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        center_id,
        name,
        role,
        image_url || null,
        sharedTitle,
        sharedContent,
        bio || null,
        display_order ?? 0,
        is_active !== false,
      ]
    )

    const created = result.rows[0]

    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: parseInt(center_id),
        action: 'create',
        entity_type: 'leadership',
        entity_id: created.id,
        entity_name: name,
      },
      request
    )

    return NextResponse.json(created)
  } catch (error) {
    console.error('Error creating leadership entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
