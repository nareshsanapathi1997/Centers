import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

async function getCenterId(id: string) {
  const r = await pool.query('SELECT center_id FROM vacancies WHERE id = $1', [id])
  return r.rows[0]?.center_id
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const centerId = await getCenterId(id)
    if (!centerId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const perm = await requireAdminPermission(token, centerId, 'vacancies', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const body = await request.json()
    const fields = ['title', 'description', 'experience', 'ctc', 'nature', 'contact_phone', 'display_order', 'is_active']
    const set: string[] = []
    const vals: any[] = []
    let i = 1
    for (const f of fields) {
      if (body[f] !== undefined) {
        set.push(`${f} = $${i++}`)
        vals.push(body[f])
      }
    }
    if (set.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    set.push('updated_at = CURRENT_TIMESTAMP')
    vals.push(id)
    const result = await pool.query(`UPDATE vacancies SET ${set.join(', ')} WHERE id = $${i} RETURNING *`, vals)
    await logActivity({ user_type: 'admin', user_id: perm.adminId, center_id: centerId, action: 'update', entity_type: 'vacancy', entity_id: parseInt(id), entity_name: body.title || result.rows[0].title?.substring(0, 50) }, request)
    return NextResponse.json(result.rows[0])
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const centerId = await getCenterId(id)
    if (!centerId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const perm = await requireAdminPermission(token, centerId, 'vacancies', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
    const name = (await pool.query('SELECT title FROM vacancies WHERE id = $1', [id])).rows[0]?.title
    await pool.query('DELETE FROM vacancies WHERE id = $1', [id])
    await logActivity({ user_type: 'admin', user_id: perm.adminId, center_id: centerId, action: 'delete', entity_type: 'vacancy', entity_id: parseInt(id), entity_name: name?.substring(0, 50) || 'Vacancy' }, request)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
