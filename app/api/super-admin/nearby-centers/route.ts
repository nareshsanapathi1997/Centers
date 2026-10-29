import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'

export const dynamic = 'force-dynamic'

// GET - Get nearby centers for a specific center
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
    const centerId = searchParams.get('centerId')

    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const result = await pool.query(
      `SELECT nc.*, c.name as nearby_center_name, c.slug as nearby_center_slug
       FROM nearby_centers nc
       INNER JOIN centers c ON nc.nearby_center_id = c.id
       WHERE nc.center_id = $1
       ORDER BY nc.display_order, c.name`,
      [centerId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching nearby centers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add a nearby center
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }
    const body = await request.json()
    const { center_id, nearby_center_id, display_order } = body

    if (!center_id || !nearby_center_id) {
      return NextResponse.json(
        { error: 'center_id and nearby_center_id are required' },
        { status: 400 }
      )
    }

    if (center_id === nearby_center_id) {
      return NextResponse.json(
        { error: 'A center cannot be nearby to itself' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO nearby_centers (center_id, nearby_center_id, display_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (center_id, nearby_center_id) 
       DO UPDATE SET display_order = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [center_id, nearby_center_id, display_order || 0]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    console.error('Error adding nearby center:', error)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'This center is already marked as nearby' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove a nearby center
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
    const centerId = searchParams.get('centerId')
    const nearbyCenterId = searchParams.get('nearbyCenterId')

    if (!centerId || !nearbyCenterId) {
      return NextResponse.json(
        { error: 'centerId and nearbyCenterId are required' },
        { status: 400 }
      )
    }

    await pool.query(
      'DELETE FROM nearby_centers WHERE center_id = $1 AND nearby_center_id = $2',
      [centerId, nearbyCenterId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting nearby center:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
