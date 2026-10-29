import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { centerId, itemType, itemId, actionType = 'click' } = body

    if (!centerId || !itemType || !itemId) {
      return NextResponse.json(
        { error: 'centerId, itemType, and itemId are required' },
        { status: 400 }
      )
    }

    // Get client IP and user agent
    const userIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const referrer = request.headers.get('referer') || null

    // Insert tracking record
    await pool.query(
      `INSERT INTO analytics_tracking 
       (center_id, item_type, item_id, action_type, user_ip, user_agent, referrer)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [centerId, itemType, itemId, actionType, userIp, userAgent, referrer]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
