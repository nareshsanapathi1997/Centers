import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { listStudentPayments, resolveCenterFee } from '@/lib/course-fees-db'
import { createPaymentOrder, validateAdminPaymentBody } from '@/lib/course-fees-payments'
import { clientIp } from '@/lib/payment-rate-limit'
import { paymentsToCsv } from '@/lib/course-fees-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })

    const centerId = Number(request.nextUrl.searchParams.get('centerId'))
    if (!centerId) return NextResponse.json({ error: 'centerId is required' }, { status: 400 })

    const perm = await requireAdminPermission(token, centerId, 'student_payments', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const search = request.nextUrl.searchParams.get('search') || undefined
    const status = request.nextUrl.searchParams.get('status') as
      | 'pending'
      | 'completed'
      | 'failed'
      | 'refunded'
      | undefined
    const exportCsv = request.nextUrl.searchParams.get('export') === 'csv'

    const rows = await listStudentPayments({
      centerId,
      search,
      status: status || undefined,
    })

    if (exportCsv) {
      const csv = paymentsToCsv(rows)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="payments-center-${centerId}.csv"`,
        },
      })
    }

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching student payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })

    const body = await request.json()
    const centerId = Number(body.center_id)
    if (!centerId) return NextResponse.json({ error: 'center_id is required' }, { status: 400 })

    const perm = await requireAdminPermission(token, centerId, 'student_payments', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    if (!body.course_master_id || !body.student_name || !body.student_mobile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const batchId = body.batch_id ? Number(body.batch_id) : null
    const fee = await resolveCenterFee(Number(body.course_master_id), centerId, batchId)
    if (!fee?.payment_available) {
      return NextResponse.json({ error: 'Course fee not available for payment' }, { status: 400 })
    }

    const paymentType = body.payment_type === 'installment' ? 'installment' : 'lumpsum'
    const installmentNo =
      paymentType === 'installment' && body.installment_no ? Number(body.installment_no) : null

    await validateAdminPaymentBody({
      center_id: centerId,
      course_master_id: Number(body.course_master_id),
      student_mobile: body.student_mobile,
      payment_type: paymentType,
      installment_no: installmentNo,
      amount_paid: Number(body.amount_paid),
      coupon_code: body.coupon_code,
      fee,
    })

    const result = await createPaymentOrder(fee, {
      center_id: centerId,
      course_master_id: Number(body.course_master_id),
      batch_id: batchId,
      student_name: body.student_name,
      student_email: body.student_email,
      student_mobile: body.student_mobile,
      payment_type: paymentType,
      installment_no: installmentNo,
      coupon_code: body.coupon_code,
      payment_method: body.payment_method || 'cash',
      transaction_id: body.transaction_id,
      notes: body.notes,
      manual_complete: true,
      created_by: perm.adminId ? `admin:${perm.adminId}` : 'admin',
      client_ip: clientIp(request),
    })

    return NextResponse.json(result.payment, { status: 201 })
  } catch (error) {
    console.error('Error recording payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 400 }
    )
  }
}
