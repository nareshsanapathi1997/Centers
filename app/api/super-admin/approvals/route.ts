import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAccess } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

// GET all pending items (news and alerts) for approval
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAccess(request)
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'pending' // pending, approved, rejected, all

    let newsQuery = 'SELECT ni.*, c.name as center_name, c.slug as center_slug FROM news_items ni JOIN centers c ON ni.center_id = c.id'
    let alertsQuery = 'SELECT a.*, c.name as center_name, c.slug as center_slug FROM alerts a JOIN centers c ON a.center_id = c.id'
    let heroQuery = 'SELECT h.*, c.name as center_name, c.slug as center_slug FROM hero_slides h JOIN centers c ON h.center_id = c.id'
    const params: any[] = []

    if (status !== 'all') {
      newsQuery += ` WHERE (ni.approval_status = $1 OR (ni.approval_status IS NULL AND $1 = 'pending'))`
      alertsQuery += ` WHERE (a.approval_status = $1 OR (a.approval_status IS NULL AND $1 = 'pending'))`
      heroQuery += ` WHERE (h.approval_status = $1 OR (h.approval_status IS NULL AND $1 = 'pending'))`
      params.push(status)
    }

    newsQuery += ' ORDER BY ni.created_at DESC'
    alertsQuery += ' ORDER BY a.created_at DESC'
    heroQuery += ' ORDER BY h.created_at DESC'

    const [newsResult, alertsResult, heroResult] = await Promise.all([
      pool.query(newsQuery, params),
      pool.query(alertsQuery, params),
      pool.query(heroQuery, params),
    ])

    return NextResponse.json({
      news: newsResult.rows,
      alerts: alertsResult.rows,
      hero: heroResult.rows,
      total: newsResult.rows.length + alertsResult.rows.length + heroResult.rows.length,
    })
  } catch (error) {
    console.error('Error fetching approvals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
