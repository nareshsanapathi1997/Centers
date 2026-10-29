import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '0')
    if (!centerId) return NextResponse.json({ error: 'centerId required' }, { status: 400 })
    const perm = await requireAdminPermission(token, centerId, 'vacancies', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const result = await pool.query('SELECT * FROM vacancies WHERE center_id = $1 ORDER BY display_order, created_at', [centerId])
    return NextResponse.json(result.rows)
  } catch (e: any) {
    if (e.code === '42P01') return NextResponse.json([])
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const { center_id, title, description, experience, ctc, nature, contact_phone, display_order, is_active } = body
    if (!center_id || !title) return NextResponse.json({ error: 'center_id and title required' }, { status: 400 })
    const perm = await requireAdminPermission(token, center_id, 'vacancies', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const result = await pool.query(
      `INSERT INTO vacancies (center_id, title, description, experience, ctc, nature, contact_phone, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [center_id, title, description || null, experience || null, ctc || null, nature || null, contact_phone || null, display_order ?? 0, is_active !== false]
    )
    const row = result.rows[0]
    await logActivity({ user_type: 'admin', user_id: perm.adminId, center_id, action: 'create', entity_type: 'vacancy', entity_id: row.id, entity_name: title.substring(0, 50) }, request)
    return NextResponse.json(row, { status: 201 })
  } catch (e: any) {
    if (e.code === '42P01') return NextResponse.json({ error: 'Vacancies table missing. Run migration.' }, { status: 500 })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
