import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAccess, getAdminToken } from '@/lib/auth'
import pool from '@/lib/db'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get('centerId')

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    const authResult = await verifyAdminAccess(token, parseInt(centerId))
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const result = await pool.query(
      'SELECT * FROM image_library WHERE center_id = $1 ORDER BY created_at DESC',
      [centerId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching image library:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const { center_id, file_url, alt_text, tags } = await request.json()

    if (!center_id || !file_url) {
      return NextResponse.json({ error: 'Center ID and file URL are required' }, { status: 400 })
    }

    const authResult = await verifyAdminAccess(token, parseInt(center_id))
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const filename = file_url.split('/').pop() || 'image'

    const result = await pool.query(
      `INSERT INTO image_library (center_id, filename, file_url, alt_text, tags, uploaded_by_user_type, uploaded_by_user_id)
       VALUES ($1, $2, $3, $4, $5, 'admin', $6)
       RETURNING *`,
      [center_id, filename, file_url, alt_text || null, tags || [], authResult.adminId]
    )

    await logActivity(
      {
        user_type: 'admin',
        user_id: authResult.adminId!,
        center_id: parseInt(center_id),
        action: 'create',
        entity_type: 'image_library',
        entity_id: result.rows[0].id,
        entity_name: filename,
      },
      { headers: request.headers }
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Error creating image library entry:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
