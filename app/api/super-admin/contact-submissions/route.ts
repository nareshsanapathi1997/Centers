import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'

export const dynamic = 'force-dynamic'

// GET - Fetch all contact submissions grouped by center
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get('centerId') // Optional filter by center
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = `
      SELECT 
        cs.*,
        c.name as center_name,
        c.slug as center_slug
      FROM contact_submissions cs
      LEFT JOIN centers c ON cs.center_id = c.id
    `
    const queryParams: any[] = []
    let paramCount = 1

    if (centerId) {
      query += ` WHERE cs.center_id = $${paramCount}`
      queryParams.push(centerId)
      paramCount++
    }

    query += ` ORDER BY cs.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`
    queryParams.push(limit, offset)

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM contact_submissions'
    const countParams: any[] = []
    if (centerId) {
      countQuery += ' WHERE center_id = $1'
      countParams.push(centerId)
    }

    const [result, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, countParams),
    ])

    const total = parseInt(countResult.rows[0].count)

    // Group by center for summary
    const centerSummaryQuery = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        COUNT(cs.id) as total_submissions,
        COUNT(CASE WHEN cs.is_read = false THEN 1 END) as unread_count
      FROM centers c
      LEFT JOIN contact_submissions cs ON c.id = cs.center_id
      GROUP BY c.id, c.name, c.slug
      HAVING COUNT(cs.id) > 0
      ORDER BY total_submissions DESC
    `

    const centerSummaryResult = await pool.query(centerSummaryQuery)

    return NextResponse.json({
      submissions: result.rows,
      centerSummary: centerSummaryResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching contact submissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contact submissions' },
      { status: 500 }
    )
  }
}

// PATCH - Mark submission as read/unread
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, is_read } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    await pool.query(
      'UPDATE contact_submissions SET is_read = $1 WHERE id = $2',
      [is_read, id]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating submission:', error)
    return NextResponse.json(
      { error: 'Failed to update submission' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a submission
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    await pool.query('DELETE FROM contact_submissions WHERE id = $1', [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting submission:', error)
    return NextResponse.json(
      { error: 'Failed to delete submission' },
      { status: 500 }
    )
  }
}
