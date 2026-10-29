import { NextRequest, NextResponse } from 'next/server'
import { getCenterIdBySlug, getCourseMasterIdBySlugOrId, resolveCenterFee } from '@/lib/course-fees-db'
import { buildPaymentQuote } from '@/lib/course-fees-payments'
import { checkRateLimit, clientIp } from '@/lib/payment-rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    if (!checkRateLimit(`quote:${ip}`, 30, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const centerSlug = body.center_slug
    const courseKey = body.course_key
    const batchId = body.batch_id ? Number(body.batch_id) : null

    if (!centerSlug || !courseKey) {
      return NextResponse.json({ error: 'center_slug and course_key are required' }, { status: 400 })
    }

    const centerId = await getCenterIdBySlug(centerSlug)
    if (!centerId) return NextResponse.json({ error: 'Center not found' }, { status: 404 })

    const course = await getCourseMasterIdBySlugOrId(courseKey)
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    const fee = await resolveCenterFee(course.id, centerId, batchId && Number.isFinite(batchId) ? batchId : null)
    if (!fee?.payment_available) {
      return NextResponse.json({ error: 'Fee not available' }, { status: 400 })
    }

    const paymentType = body.payment_type === 'installment' ? 'installment' : 'lumpsum'
    const installmentNo =
      paymentType === 'installment' && body.installment_no ? Number(body.installment_no) : null

    const quote = await buildPaymentQuote({
      fee,
      payment_type: paymentType,
      installment_no: installmentNo,
      coupon_code: typeof body.coupon_code === 'string' ? body.coupon_code.slice(0, 60) : null,
      referral_code: typeof body.referral_code === 'string' ? body.referral_code.slice(0, 40) : null,
      student_mobile: typeof body.student_mobile === 'string' ? body.student_mobile.slice(0, 20) : null,
      center_id: centerId,
      course_master_id: course.id,
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Quote error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Quote failed' },
      { status: 400 }
    )
  }
}
