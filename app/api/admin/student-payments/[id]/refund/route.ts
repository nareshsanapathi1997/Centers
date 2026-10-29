import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { refundPayment } from '@/lib/course-fees-payments'
import { notifyStudentPaymentRefunded } from '@/lib/student-account-provisioning'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })

    const paymentId = Number(params.id)
    const body = await request.json().catch(() => ({}))
    const centerId = Number(body.center_id)

    const row = await pool.query(`SELECT center_id FROM student_fee_payments WHERE id = $1`, [paymentId])
    if (!row.rows[0]) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    // Authorise against the payment's own centre, never a client-supplied one.
    const paymentCenterId = Number(row.rows[0].center_id)
    if (centerId && centerId !== paymentCenterId) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }
    const perm = await requireAdminPermission(token, paymentCenterId, 'student_payments', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const payment = await refundPayment(paymentId, body.notes)
    void notifyStudentPaymentRefunded({ payment, notes: body.notes })
    return NextResponse.json(payment)
  } catch (error) {
    console.error('Refund error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Refund failed' },
      { status: 400 }
    )
  }
}
