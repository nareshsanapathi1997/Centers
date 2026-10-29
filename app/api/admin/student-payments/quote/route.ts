import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { resolveCenterFee } from '@/lib/course-fees-db'
import { buildPaymentQuote } from '@/lib/course-fees-payments'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })

    const body = await request.json()
    const centerId = Number(body.center_id)
    if (!centerId) return NextResponse.json({ error: 'center_id is required' }, { status: 400 })

    const perm = await requireAdminPermission(token, centerId, 'student_payments', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const courseMasterId = Number(body.course_master_id)
    const batchId = body.batch_id ? Number(body.batch_id) : null
    if (!courseMasterId) return NextResponse.json({ error: 'course_master_id required' }, { status: 400 })

    const fee = await resolveCenterFee(courseMasterId, centerId, batchId)
    if (!fee?.payment_available) {
      return NextResponse.json({ error: 'Fee not available' }, { status: 400 })
    }

    const paymentType = body.payment_type === 'installment' ? 'installment' : 'lumpsum'
    const quote = await buildPaymentQuote({
      fee,
      payment_type: paymentType,
      installment_no: paymentType === 'installment' && body.installment_no ? Number(body.installment_no) : null,
      coupon_code: body.coupon_code,
      center_id: centerId,
      course_master_id: courseMasterId,
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Admin quote error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Quote failed' },
      { status: 400 }
    )
  }
}
