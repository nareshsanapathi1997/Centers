import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = new Set(['visible', 'hidden'])

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get('centerId')
    const page = Number.parseInt(searchParams.get('page') || '1', 10)
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10)
    const status = searchParams.get('status') || 'all'
    const offset = (page - 1) * limit

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(
      token,
      Number.parseInt(centerId, 10),
      'blog',
      httpMethodToAction(request.method),
    )
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const params: Array<string | number> = [centerId]
    let statusFilter = ''
    if (status !== 'all' && VALID_STATUSES.has(status)) {
      params.push(status)
      statusFilter = ` AND bc.status = $${params.length}`
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::text AS count
       FROM blog_comments bc
       WHERE bc.center_id = $1${statusFilter}`,
      params,
    )
    const total = Number.parseInt(countResult.rows[0]?.count || '0', 10)

    const listParams = [...params, limit, offset]
    const result = await pool.query(
      `SELECT bc.*, bp.title AS blog_post_title, bp.slug AS blog_post_slug, c.slug AS center_slug
       FROM blog_comments bc
       JOIN blog_posts bp ON bp.id = bc.blog_post_id
       JOIN centers c ON c.id = bc.center_id
       WHERE bc.center_id = $1${statusFilter}
       ORDER BY bc.created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    )

    const hiddenResult = await pool.query(
      `SELECT COUNT(*)::text AS count FROM blog_comments WHERE center_id = $1 AND status = 'hidden'`,
      [centerId],
    )

    return NextResponse.json({
      comments: result.rows,
      hiddenCount: Number.parseInt(hiddenResult.rows[0]?.count || '0', 10),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    })
  } catch (error) {
    console.error('Error fetching blog comments:', error)
    return NextResponse.json({ error: 'Failed to fetch blog comments' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, centerId, status, is_read: isRead } = body

    if (!id || !centerId) {
      return NextResponse.json({ error: 'Comment ID and center ID are required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(
      token,
      Number.parseInt(String(centerId), 10),
      'blog',
      httpMethodToAction(request.method),
    )
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const existing = await pool.query(
      'SELECT * FROM blog_comments WHERE id = $1 AND center_id = $2',
      [id, centerId],
    )
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const row = existing.rows[0]
    const nextStatus = status ?? row.status
    if (!VALID_STATUSES.has(nextStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const nextIsRead = typeof isRead === 'boolean' ? isRead : row.is_read
    const reviewedAt = nextStatus !== row.status ? new Date() : row.reviewed_at

    await pool.query(
      `UPDATE blog_comments
       SET status = $1, is_read = $2, reviewed_at = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [nextStatus, nextIsRead, reviewedAt, id],
    )

    if (nextStatus !== row.status) {
      revalidateTag(`center-blog-${centerId}`)
      revalidateTag(`blog-comments-${row.blog_post_id}`)
    }

    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: Number.parseInt(String(centerId), 10),
        action: 'update',
        entity_type: 'blog_comment',
        entity_id: id,
        entity_name: row.author_name || 'Blog comment',
        details: { status: nextStatus, is_read: nextIsRead },
      },
      request,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating blog comment:', error)
    return NextResponse.json({ error: 'Failed to update blog comment' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const centerId = searchParams.get('centerId')

    if (!id || !centerId) {
      return NextResponse.json({ error: 'Comment ID and center ID are required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(
      token,
      Number.parseInt(centerId, 10),
      'blog',
      httpMethodToAction(request.method),
    )
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const existing = await pool.query(
      'SELECT * FROM blog_comments WHERE id = $1 AND center_id = $2',
      [id, centerId],
    )
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const row = existing.rows[0]
    await pool.query('DELETE FROM blog_comments WHERE id = $1', [id])

    revalidateTag(`center-blog-${centerId}`)
    revalidateTag(`blog-comments-${row.blog_post_id}`)

    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: Number.parseInt(centerId, 10),
        action: 'delete',
        entity_type: 'blog_comment',
        entity_id: Number.parseInt(id, 10),
        entity_name: row.author_name || 'Blog comment',
      },
      request,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting blog comment:', error)
    return NextResponse.json({ error: 'Failed to delete blog comment' }, { status: 500 })
  }
}
