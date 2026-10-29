import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

// GET - Fetch all contact submissions for a center
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get('centerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    if (!centerId) {
      return NextResponse.json(
        { error: 'Center ID is required' },
        { status: 400 }
      )
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, parseInt(centerId), 'enquiries', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM contact_submissions WHERE center_id = $1',
      [centerId]
    )
    const total = parseInt(countResult.rows[0].count)

    // Get submissions with pagination
    const result = await pool.query(
      `SELECT * FROM contact_submissions 
       WHERE center_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [centerId, limit, offset]
    )

    return NextResponse.json({
      submissions: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching enquiries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enquiries' },
      { status: 500 }
    )
  }
}

// PATCH - Mark submission as read/unread
export async function PATCH(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, is_read, centerId } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    if (!centerId) {
      return NextResponse.json(
        { error: 'Center ID is required' },
        { status: 400 }
      )
    }

    const perm = await requireAdminPermission(token, parseInt(centerId), 'enquiries', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    // Get submission details
    const submission = await pool.query(
      'SELECT * FROM contact_submissions WHERE id = $1',
      [id]
    )

    if (submission.rows.length === 0) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    await pool.query(
      'UPDATE contact_submissions SET is_read = $1 WHERE id = $2',
      [is_read, id]
    )

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: parseInt(centerId),
        action: 'update',
        entity_type: 'enquiry',
        entity_id: id,
        entity_name: submission.rows[0].name || 'Enquiry',
        details: { is_read },
      },
      request
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating enquiry:', error)
    return NextResponse.json(
      { error: 'Failed to update enquiry' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a submission
export async function DELETE(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const centerId = searchParams.get('centerId')

    if (!id) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    if (!centerId) {
      return NextResponse.json(
        { error: 'Center ID is required' },
        { status: 400 }
      )
    }

    const perm = await requireAdminPermission(token, parseInt(centerId), 'enquiries', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    // Get submission details before deletion
    const submission = await pool.query(
      'SELECT * FROM contact_submissions WHERE id = $1',
      [id]
    )

    if (submission.rows.length === 0) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    await pool.query('DELETE FROM contact_submissions WHERE id = $1', [id])

    // Log activity
    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: parseInt(centerId),
        action: 'delete',
        entity_type: 'enquiry',
        entity_id: parseInt(id),
        entity_name: submission.rows[0].name || 'Enquiry',
      },
      request
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting enquiry:', error)
    return NextResponse.json(
      { error: 'Failed to delete enquiry' },
      { status: 500 }
    )
  }
}
