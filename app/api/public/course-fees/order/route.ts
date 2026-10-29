import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCenterIdBySlug, getCourseMasterIdBySlugOrId, resolveCenterFee } from '@/lib/course-fees-db'
import { createPaymentOrder } from '@/lib/course-fees-payments'
import { checkRateLimit, clientIp } from '@/lib/payment-rate-limit'
import { parseBody } from '@/lib/api-validation'
import { badRequest, notFound } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

/**
 * Validated strictly because this is the entry point to a money movement: a bad
 * `installment_no` or a non-numeric `batch_id` previously reached the fee
 * resolver as NaN and produced a confusing 400 from deep inside the quote logic.
 */
/** Optional text the checkout may send as '', null or undefined. Empty -> undefined. */
const optText = (max: number, msg: string, upper = false) =>
  z.preprocess(
    (v) => {
      if (v == null) return undefined
      const t = String(v).trim()
      if (!t) return undefined
      return upper ? t.toUpperCase() : t
    },
    z.string().max(max, msg).optional(),
  )

const OrderBody = z.object({  center_slug: z.string().trim().min(1, 'center_slug is required').max(120),
  course_key: z.union([z.string().trim().min(1), z.number()]),
  batch_id: z.coerce.number().int().positive().nullish(),
  student_name: z.string().trim().min(1, 'student_name is required').max(200),
  student_email: z
    .preprocess((v) => (v == null ? undefined : String(v).trim()), z.string().max(255).optional())
    .transform((value) => value || undefined)
    .pipe(z.string().email('Enter a valid email address').optional()),
  student_mobile: z
    .string()
    .trim()
    .min(1, 'student_mobile is required')
    .refine((value) => value.replace(/\D/g, '').length >= 10, 'Enter a valid 10-digit mobile'),
  payment_type: z.enum(['lumpsum', 'installment']).default('lumpsum'),
  installment_no: z.coerce.number().int().positive().nullish(),
  coupon_code: optText(60, 'That coupon code is too long. Check the code and try again.', true),
  referral_code: optText(40, 'That referral code is too long. Check the code and try again.', true),
  form_data: z.preprocess((v) => (v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, x]) => x != null && x !== '')) : undefined), z.record(z.string().max(80), z.union([z.string().max(500, 'One of the form answers is too long'), z.number(), z.boolean()]).transform(String)).optional()),
  terms_accepted: z.preprocess((v) => (v == null ? undefined : v === true || v === 'true'), z.boolean().optional()),
  idempotency_key: optText(200, 'Invalid request key'),
})

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    if (!checkRateLimit(`order:${ip}`, 15, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
    }

    const parsed = await parseBody(request, OrderBody)
    if (!parsed.ok) return parsed.response
    const body = parsed.data
    const batchId = body.batch_id ?? null

    const centerId = await getCenterIdBySlug(body.center_slug)
    if (!centerId) return notFound('Center not found')

    const course = await getCourseMasterIdBySlugOrId(String(body.course_key))
    if (!course) return notFound('Course not found')

    const fee = await resolveCenterFee(course.id, centerId, batchId)
    if (!fee?.payment_available) {
      return badRequest('Payment is not available until center fee is saved')
    }

    const result = await createPaymentOrder(fee, {
      center_id: centerId,
      course_master_id: course.id,
      batch_id: batchId,
      student_name: body.student_name,
      student_email: body.student_email,
      student_mobile: body.student_mobile,
      payment_type: body.payment_type,
      installment_no: body.payment_type === 'installment' ? (body.installment_no ?? null) : null,
      coupon_code: body.coupon_code,
      referral_code: body.referral_code,
      form_data: body.form_data ?? null,
      terms_accepted: body.terms_accepted === true,
      idempotency_key:
        body.idempotency_key || `${centerId}-${course.id}-${body.student_mobile}-${Date.now()}`,
      client_ip: ip,
    })

    return NextResponse.json(
      {
        payment_id: result.payment.id,
        receipt_no: result.payment.receipt_no,
        amount_due: result.quote.amount_due,
        gst_amount: result.quote.gst_amount,
        coupon_discount: result.quote.coupon_discount,
        total_discount: result.quote.total_discount,
        status: result.payment.status,
        approval_status: (result.payment as { approval_status?: string | null }).approval_status ?? null,
        gateway_order_id: (result.payment as { gateway_order_id?: string | null }).gateway_order_id ?? null,
        online_enabled: result.online_enabled,
        razorpay: result.razorpay,
      },
      { status: 201 }
    )
  } catch (error) {
    const code = (error as { code?: unknown })?.code
    const extra = (error as { extra?: Record<string, unknown> })?.extra
    if (code === 'BATCH_FULL') {
      return NextResponse.json({ error: (error as Error).message, code, ...(extra || {}) }, { status: 409 })
    }
    console.error('Error creating payment order:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 400 }
    )
  }
}
