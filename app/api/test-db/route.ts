import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Diagnostics leak schema and row counts, so they are super-admin only and
  // reduced to a bare reachability check outside development.
  const auth = await verifySuperAdminAccess(request)
  if (!auth.isValid) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const result = await pool.query(
      'SELECT NOW() as "current_time", COUNT(*) as center_count FROM centers'
    )

    return NextResponse.json({
      success: true,
      database: 'connected',
      currentTime: result.rows[0].current_time,
      centerCount: result.rows[0].center_count,
    })
  } catch (error) {
    console.error('Database diagnostic failed:', error)
    return NextResponse.json(
      {
        success: false,
        database: 'disconnected',
        error:
          process.env.NODE_ENV === 'production'
            ? 'Database unreachable'
            : error instanceof Error
              ? error.message
              : String(error),
      },
      { status: 500 }
    )
  }
}
