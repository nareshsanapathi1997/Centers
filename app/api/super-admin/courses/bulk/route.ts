import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const { ids, action, is_active } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 })
    }

    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '0', 10)
    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    if (action === 'delete') {
      await pool.query('DELETE FROM courses WHERE id = ANY($1) AND center_id = $2', [ids, centerId])

      await logActivity(
        {
          user_type: 'super_admin',
          user_id: authResult.adminId!,
          center_id: centerId,
          action: 'bulk_delete',
          entity_type: 'course',
          entity_name: `${ids.length} items`,
          details: { ids },
        },
        { headers: request.headers },
      )

      return NextResponse.json({ message: `Successfully deleted ${ids.length} item(s)` })
    }

    if (action === 'status') {
      await pool.query(
        'UPDATE courses SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2) AND center_id = $3',
        [is_active, ids, centerId],
      )

      await logActivity(
        {
          user_type: 'super_admin',
          user_id: authResult.adminId!,
          center_id: centerId,
          action: 'bulk_update',
          entity_type: 'course',
          entity_name: `${ids.length} items`,
          details: { ids, is_active },
        },
        { headers: request.headers },
      )

      return NextResponse.json({
        message: `Successfully ${is_active ? 'activated' : 'deactivated'} ${ids.length} item(s)`,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[super-admin/courses/bulk POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
