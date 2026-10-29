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

    const perm = await requireAdminPermission(token, centerId, 'senior_faculty', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const result = await pool.query(
      'SELECT * FROM senior_faculty WHERE center_id = $1 ORDER BY display_order, created_at',
      [centerId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching senior faculty:', error)
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
    const { center_id, name, role, description, image_url, display_order, is_active } = body

    if (!name || !role) {
      return NextResponse.json({ error: 'Name and role are required' }, { status: 400 })
    }

    if (!center_id) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, parseInt(center_id), 'senior_faculty', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const result = await pool.query(
      `INSERT INTO senior_faculty (center_id, name, role, description, image_url, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        center_id,
        name,
        role,
        description || null,
        image_url || null,
        display_order || 0,
        is_active !== undefined ? is_active : true,
      ]
    )

    const newFaculty = result.rows[0]

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: parseInt(center_id),
        action: 'create',
        entity_type: 'senior_faculty',
        entity_id: newFaculty.id,
        entity_name: name,
      },
      request
    )

    return NextResponse.json(newFaculty)
  } catch (error) {
    console.error('Error creating senior faculty:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
