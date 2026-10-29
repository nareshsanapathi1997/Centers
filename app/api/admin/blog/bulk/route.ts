import { NextRequest, NextResponse } from 'next/server'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import pool from '@/lib/db'
import { logActivity } from '@/lib/activity-log'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const { ids, action, is_published } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const centerId = parseInt(searchParams.get('centerId') || '0')

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }
    const perm = await requireAdminPermission(token, centerId, 'blog', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    if (action === 'delete') {
      await pool.query('DELETE FROM blog_posts WHERE id = ANY($1) AND center_id = $2', [
        ids,
        centerId,
      ])

      await logActivity(
        {
          user_type: 'admin',
          user_id: perm.adminId,
          center_id: centerId,
          action: 'bulk_delete',
          entity_type: 'blog_post',
          entity_name: `${ids.length} items`,
          details: { ids },
        },
        { headers: request.headers }
      )

      return NextResponse.json({ message: `Successfully deleted ${ids.length} item(s)` })
    } else if (action === 'status') {
      await pool.query(
        'UPDATE blog_posts SET is_published = $1, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($2) AND center_id = $3',
        [is_published, ids, centerId]
      )

      await logActivity(
        {
          user_type: 'admin',
          user_id: perm.adminId,
          center_id: centerId,
          action: 'bulk_update',
          entity_type: 'blog_post',
          entity_name: `${ids.length} items`,
          details: { ids, is_published },
        },
        { headers: request.headers }
      )

      return NextResponse.json({
        message: `Successfully ${is_published ? 'published' : 'unpublished'} ${ids.length} item(s)`,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error performing bulk operation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
