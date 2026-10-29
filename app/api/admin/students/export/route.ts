import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    const search = request.nextUrl.searchParams.get('search')?.trim() || ''

    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'students', 'read')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const params: unknown[] = [centerId]
    let where = 'WHERE s.center_id = $1'
    if (search) {
      params.push(`%${search}%`)
      where += ` AND (s.full_name ILIKE $2 OR s.mobile ILIKE $2 OR s.email ILIKE $2 OR s.regno ILIKE $2)`
    }

    const result = await pool.query(
      `SELECT s.regno, s.full_name, s.email, s.mobile, s.is_active, s.last_login_at, s.created_at,
              COUNT(sfp.id)::int AS payment_count
       FROM students s
       LEFT JOIN student_fee_payments sfp ON sfp.student_id = s.id
       ${where}
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT 2000`,
      params
    )

    const header = 'Reg No,Name,Email,Mobile,Active,Last Login,Created,Payment Count\n'
    const rows = result.rows
      .map((s) =>
        [
          s.regno,
          `"${(s.full_name || '').replace(/"/g, '""')}"`,
          s.email || '',
          s.mobile,
          s.is_active ? 'Yes' : 'No',
          s.last_login_at ? new Date(s.last_login_at).toISOString() : '',
          new Date(s.created_at).toISOString(),
          s.payment_count,
        ].join(',')
      )
      .join('\n')

    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="students-center-${centerId}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export students error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
