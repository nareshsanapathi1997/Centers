import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAccess } from '@/lib/auth'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySuperAdminAccess(request)
    if (!auth.isValid) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 403 })
    }

    const centerId = request.nextUrl.searchParams.get('centerId')

    const params: unknown[] = []
    let centerFilter = ''
    if (centerId) {
      params.push(parseInt(centerId, 10))
      centerFilter = `WHERE s.center_id = $1`
    }

    const [students, payments, revenue] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM students s ${centerFilter}`, params),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM student_fee_payments sfp ${centerId ? 'WHERE sfp.center_id = $1' : ''}`,
        centerId ? params : []
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount_paid), 0)::numeric AS total
         FROM student_fee_payments sfp
         WHERE status = 'completed' ${centerId ? 'AND sfp.center_id = $1' : ''}`,
        centerId ? params : []
      ),
    ])

    const byCenter = await pool.query(
      `SELECT c.id, c.name, COUNT(s.id)::int AS student_count,
              COUNT(sfp.id)::int AS payment_count,
              COALESCE(SUM(CASE WHEN sfp.status = 'completed' THEN sfp.amount_paid ELSE 0 END), 0)::numeric AS revenue
       FROM centers c
       LEFT JOIN students s ON s.center_id = c.id
       LEFT JOIN student_fee_payments sfp ON sfp.center_id = c.id
       WHERE c.is_active = true
       GROUP BY c.id
       ORDER BY revenue DESC NULLS LAST
       LIMIT 50`
    )

    return NextResponse.json({
      totals: {
        students: students.rows[0]?.count || 0,
        payments: payments.rows[0]?.count || 0,
        revenue: Number(revenue.rows[0]?.total || 0),
      },
      byCenter: byCenter.rows,
    })
  } catch (error) {
    console.error('Super admin student analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
