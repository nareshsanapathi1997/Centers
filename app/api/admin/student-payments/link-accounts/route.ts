import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission } from '@/lib/admin-access'
import { linkPaymentsToStudent } from '@/lib/student-portal-db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const centerId = parseInt(body.centerId, 10)

    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'student_payments', 'update')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const paymentIds: number[] = Array.isArray(body.paymentIds) ? body.paymentIds.map(Number) : []
    const linkAllUnlinked = body.linkAllUnlinked === true

    let linked = 0

    if (linkAllUnlinked) {
      const unlinked = await pool.query(
        `SELECT DISTINCT sfp.student_mobile
         FROM student_fee_payments sfp
         WHERE sfp.center_id = $1 AND sfp.student_id IS NULL AND sfp.student_mobile IS NOT NULL`,
        [centerId]
      )
      for (const row of unlinked.rows) {
        const student = await pool.query(
          `SELECT id, mobile FROM students WHERE center_id = $1 AND mobile = $2 AND is_active = true LIMIT 1`,
          [centerId, row.student_mobile]
        )
        if (student.rows[0]) {
          await linkPaymentsToStudent(student.rows[0].id, centerId, student.rows[0].mobile)
          linked++
        }
      }
    } else if (paymentIds.length > 0) {
      for (const paymentId of paymentIds) {
        const pay = await pool.query(
          `SELECT student_mobile FROM student_fee_payments WHERE id = $1 AND center_id = $2`,
          [paymentId, centerId]
        )
        const mobile = pay.rows[0]?.student_mobile
        if (!mobile) continue
        const student = await pool.query(
          `SELECT id, mobile FROM students WHERE center_id = $1 AND mobile = $2 LIMIT 1`,
          [centerId, mobile]
        )
        if (student.rows[0]) {
          await pool.query(
            `UPDATE student_fee_payments SET student_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [student.rows[0].id, paymentId]
          )
          linked++
        }
      }
    }

    return NextResponse.json({ linked, message: `Linked ${linked} payment(s) to portal accounts` })
  } catch (error) {
    console.error('Link accounts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
