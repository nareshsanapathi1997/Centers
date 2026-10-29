import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifyAdminAccess, getAdminToken } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '0')
    if (!centerId) return NextResponse.json({ error: 'centerId is required' }, { status: 400 })

    const authResult = await verifyAdminAccess(token, centerId)
    if (!authResult.authorized) return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })

    const result = await pool.query(
      'SELECT * FROM contact_page_content WHERE center_id = $1',
      [centerId]
    )
    if (result.rows.length === 0) return NextResponse.json(null)
    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    if (error.code === '42P01') return NextResponse.json(null)
    console.error('Error fetching contact page:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { center_id, heading, intro_text } = body
    if (!center_id) return NextResponse.json({ error: 'center_id is required' }, { status: 400 })

    const authResult = await verifyAdminAccess(token, center_id)
    if (!authResult.authorized) return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })

    const result = await pool.query(
      `INSERT INTO contact_page_content (center_id, heading, intro_text)
       VALUES ($1, $2, $3)
       ON CONFLICT (center_id)
       DO UPDATE SET heading = EXCLUDED.heading, intro_text = EXCLUDED.intro_text, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [center_id, heading || 'Contact Us', intro_text || null]
    )
    const row = result.rows[0]

    await logActivity(
      {
        user_type: 'admin',
        user_id: authResult.adminId!,
        center_id: center_id,
        action: 'update',
        entity_type: 'contact_page',
        entity_id: row.id,
        entity_name: 'Contact Page',
      },
      request
    )

    return NextResponse.json(row, { status: 201 })
  } catch (error: any) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'contact_page_content table does not exist. Run: node scripts/add-contact-page-table.js' }, { status: 500 })
    }
    console.error('Error saving contact page:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
