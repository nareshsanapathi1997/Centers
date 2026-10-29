import pool from '@/lib/db'
import type { FeeStructureInput, ResolvedCenterFee, StudentFeePayment } from '@/lib/course-fees-types'
import { computePayableAmount, installmentPayAmount, resolveInstallmentDueDate } from '@/lib/course-fees-utils'
import { createRazorpayOrder, isOnlinePaymentEnabled } from '@/lib/razorpay'
import { getEnrollmentSettings } from '@/lib/enrollment-settings'
import {
  applyApprovalOnCompletion,
  assertSeatAvailable,
  computeDiscountStack,
  maybeIssueReferralCode,
  normMobile,
  type CouponStatus,
} from '@/lib/enrollment-engine'

/** Run post-completion side-effects, deferring provisioning while approval is pending. */
async function afterPaymentCompleted(payment: StudentFeePayment, opts: { manual: boolean }): Promise<StudentFeePayment> {
  let approval: 'pending' | 'auto' = 'auto'
  try {
    approval = opts.manual
      ? (await pool.query(`UPDATE student_fee_payments SET approval_status = 'auto' WHERE id = $1 AND approval_status IS NULL`, [payment.id]), 'auto')
      : await applyApprovalOnCompletion(payment)
  } catch (e) {
    console.error('approval hook failed:', e)
  }
  const updated = { ...payment, approval_status: approval } as StudentFeePayment
  void notifyPaymentReceipt(updated)
  if (approval !== 'pending') {
    void import('@/lib/student-account-provisioning').then(({ ensureStudentAccountFromPayment }) =>
      ensureStudentAccountFromPayment(updated)
    )
    void maybeIssueReferralCode(updated).catch(() => undefined)
  }
  return updated
}

async function notifyPaymentReceipt(payment: StudentFeePayment): Promise<void> {
  const { sendPaymentReceiptEmail } = await import('@/lib/payment-receipt-email')
  await sendPaymentReceiptEmail(payment)
}

export type PaymentQuote = {
  payment_type: 'lumpsum' | 'installment'
  installment_no: number | null
  coupon_discount: number
  gst_rate: number
  gst_amount: number
  amount_due: number
  discount_id: number | null
  coupon_code: string | null
  subtotal: number
  coupon_status: CouponStatus
  coupon_message: string | null
  scholarship_discount: number
  scholarship_tier_id: number | null
  scholarship_name: string | null
  referral_discount: number
  referral_code: string | null
  referral_status: string
  referral_message: string | null
  total_discount: number
}

export type CreateOrderInput = {
  center_id: number
  course_master_id: number
  batch_id?: number | null
  student_name: string
  student_email?: string | null
  student_mobile: string
  payment_type: 'lumpsum' | 'installment'
  installment_no?: number | null
  coupon_code?: string | null
  referral_code?: string | null
  form_data?: Record<string, string> | null
  terms_accepted?: boolean
  idempotency_key?: string | null
  client_ip?: string | null
  created_by?: string | null
  payment_method?: string | null
  manual_complete?: boolean
  transaction_id?: string | null
  notes?: string | null
}

const DEFAULT_GST_RATE = Number(process.env.DEFAULT_GST_RATE || 18)

export function getGstRateFromFee(fee: FeeStructureInput): number {
  const rules = fee.payment_rules || {}
  const rate = Number(rules.gst_rate ?? DEFAULT_GST_RATE)
  return Number.isFinite(rate) && rate >= 0 ? rate : DEFAULT_GST_RATE
}

export async function findApplicableDiscount(input: {
  courseMasterId: number
  centerId: number
  couponCode?: string | null
}) {
  const code = input.couponCode?.trim()
  if (!code) return null
  const result = await pool.query(
    `SELECT d.* FROM course_fee_discounts d
     WHERE d.is_active = true AND d.course_master_id = $1
       AND LOWER(TRIM(d.coupon_code)) = LOWER($2)
       AND (d.center_id IS NULL OR d.center_id = $3)
     ORDER BY d.center_id DESC NULLS LAST LIMIT 1`,
    [input.courseMasterId, code, input.centerId]
  )
  if (!result.rows[0]) return null
  return { ...result.rows[0], discount_value: Number(result.rows[0].discount_value) }
}

export async function findLegacyCourseCoupon(courseMasterId: number, couponCode: string) {
  const result = await pool.query(
    `SELECT coupon_code, coupon_enabled, discount_percent, discount_amount
     FROM course_masters WHERE id = $1`,
    [courseMasterId]
  )
  const row = result.rows[0]
  if (!row || row.coupon_enabled === false) return null
  if (String(row.coupon_code || '').trim().toLowerCase() !== couponCode.trim().toLowerCase()) return null
  const amt = row.discount_amount != null ? Number(row.discount_amount) : 0
  const pct = row.discount_percent != null ? Number(row.discount_percent) : 0
  if (amt > 0) return { discount_type: 'fixed' as const, discount_value: amt }
  if (pct > 0) return { discount_type: 'percent' as const, discount_value: pct }
  return null
}

export function computeCouponDiscount(
  baseAmount: number,
  discount: { discount_type: 'percent' | 'fixed'; discount_value: number }
): number {
  if (discount.discount_type === 'percent') {
    return Math.min(baseAmount, Math.round((baseAmount * discount.discount_value) / 100))
  }
  return Math.min(baseAmount, discount.discount_value)
}

export async function buildPaymentQuote(input: {
  fee: ResolvedCenterFee
  payment_type: 'lumpsum' | 'installment'
  installment_no?: number | null
  coupon_code?: string | null
  referral_code?: string | null
  student_mobile?: string | null
  center_id: number
  course_master_id: number
}): Promise<PaymentQuote> {
  const installmentNo =
    input.payment_type === 'installment' && input.installment_no ? Number(input.installment_no) : null

  const subtotal =
    input.payment_type === 'installment' && installmentNo
      ? installmentPayAmount(input.fee, installmentNo)
      : computePayableAmount(input.fee)

  const settings = await getEnrollmentSettings(input.center_id)
  const stack = await computeDiscountStack({
    centerId: input.center_id,
    courseMasterId: input.course_master_id,
    subtotal,
    allowFixed: input.payment_type === 'lumpsum' || installmentNo === 1,
    couponCode: input.coupon_code,
    referralCode: input.referral_code,
    mobile: input.student_mobile,
    settings,
  })

  const taxable = Math.max(0, subtotal - stack.total)
  const gstRate = getGstRateFromFee(input.fee)
  const gstAmount = Math.round((taxable * gstRate) / 100)
  const couponApplied = stack.coupon.discount && stack.coupon_discount > 0 ? stack.coupon.discount : null
  return {
    payment_type: input.payment_type,
    installment_no: installmentNo,
    coupon_discount: stack.coupon_discount,
    gst_rate: gstRate,
    gst_amount: gstAmount,
    amount_due: taxable + gstAmount,
    discount_id: couponApplied ? couponApplied.id : null,
    coupon_code: couponApplied ? couponApplied.coupon_code : null,
    subtotal,
    coupon_status: stack.coupon.status,
    coupon_message: stack.coupon.message,
    scholarship_discount: stack.scholarship_discount,
    scholarship_tier_id: stack.scholarship_discount > 0 && stack.scholarship ? stack.scholarship.tier_id : null,
    scholarship_name: stack.scholarship ? stack.scholarship.tier_name : null,
    referral_discount: stack.referral_discount,
    referral_code: stack.referral_discount > 0 ? stack.referral.code : null,
    referral_status: stack.referral.status,
    referral_message: stack.referral.message,
    total_discount: stack.total,
  }
}

export async function getPaidInstallmentNumbers(input: {
  centerId: number
  courseMasterId: number
  studentMobile: string
}): Promise<number[]> {
  const mobile = input.studentMobile.trim()
  const result = await pool.query<{ installment_no: number }>(
    `SELECT DISTINCT installment_no FROM student_fee_payments
     WHERE center_id = $1 AND course_master_id = $2 AND student_mobile = $3
       AND status = 'completed' AND payment_type = 'installment' AND installment_no IS NOT NULL`,
    [input.centerId, input.courseMasterId, mobile]
  )
  return result.rows.map((r) => r.installment_no).sort((a, b) => a - b)
}

export async function assertInstallmentPayable(input: {
  fee: FeeStructureInput
  centerId: number
  courseMasterId: number
  studentMobile: string
  installmentNo: number
}): Promise<void> {
  const paid = await getPaidInstallmentNumbers(input)
  if (paid.includes(input.installmentNo)) throw new Error(`Installment #${input.installmentNo} is already paid.`)
  for (let i = 1; i < input.installmentNo; i++) {
    if (!paid.includes(i)) throw new Error(`Pay installment #${i} before #${input.installmentNo}.`)
  }
}

export async function generateSequentialReceiptNo(centerId: number): Promise<string> {
  const year = new Date().getFullYear()
  // Upsert + read in one transaction: the upsert's row lock keeps the sequence unique.
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO payment_receipt_sequences (center_id, year, last_seq) VALUES ($1,$2,1)
       ON CONFLICT (center_id, year) DO UPDATE SET last_seq = payment_receipt_sequences.last_seq + 1`,
      [centerId, year]
    )
    const result = await client.query(
      `SELECT last_seq FROM payment_receipt_sequences WHERE center_id = $1 AND year = $2`,
      [centerId, year]
    )
    await client.query('COMMIT')
    return `RCP-${centerId}-${year}-${String(result.rows[0].last_seq).padStart(5, '0')}`
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

function mapPaymentRow(row: Record<string, unknown>): StudentFeePayment {
  const snap = row.fee_snapshot
  return {
    ...(row as StudentFeePayment),
    amount_due: Number(row.amount_due),
    amount_paid: Number(row.amount_paid),
    discount_applied: Number(row.discount_applied),
    fee_snapshot: typeof snap === 'string' ? JSON.parse(snap) : (snap as Record<string, unknown>) || {},
  }
}

async function upsertPaidInstallment(input: {
  payment: StudentFeePayment
  fee: FeeStructureInput
  installmentNo: number
  amount: number
  paidAmount: number
}): Promise<void> {
  const dueDate = resolveInstallmentDueDate(input.fee, input.installmentNo)
  const dueDateStr = dueDate ? dueDate.toISOString().slice(0, 10) : null
  const updated = await pool.query(
    `UPDATE student_payment_installments SET
       payment_id = $1, paid_amount = $8, paid_date = NOW(), status = 'paid',
       due_date = COALESCE(due_date, $7), amount = $6
     WHERE center_id = $2 AND course_master_id = $3 AND student_mobile = $4 AND installment_no = $5
     RETURNING id`,
    [
      input.payment.id,
      input.payment.center_id,
      input.payment.course_master_id,
      input.payment.student_mobile,
      input.installmentNo,
      input.amount,
      dueDateStr,
      input.paidAmount,
    ]
  )
  if (updated.rows[0]) return
  await pool.query(
    `INSERT INTO student_payment_installments (
       payment_id, center_id, course_master_id, student_mobile, installment_no,
       amount, due_date, paid_amount, paid_date, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),'paid')`,
    [
      input.payment.id,
      input.payment.center_id,
      input.payment.course_master_id,
      input.payment.student_mobile,
      input.installmentNo,
      input.amount,
      dueDateStr,
      input.paidAmount,
    ]
  )
}

async function syncInstallments(payment: StudentFeePayment, fee: FeeStructureInput): Promise<void> {
  const count = Math.min(fee.num_installments || 1, 12)
  if (payment.payment_type === 'lumpsum') {
    for (let n = 1; n <= count; n++) {
      await upsertPaidInstallment({
        payment,
        fee,
        installmentNo: n,
        amount: installmentPayAmount(fee, n),
        paidAmount: installmentPayAmount(fee, n),
      })
    }
    return
  }
  if (payment.installment_no) {
    await upsertPaidInstallment({
      payment,
      fee,
      installmentNo: payment.installment_no,
      amount: installmentPayAmount(fee, payment.installment_no),
      paidAmount: payment.amount_paid,
    })
  }
}

export async function createPaymentOrder(
  fee: ResolvedCenterFee,
  input: CreateOrderInput
): Promise<{
  payment: StudentFeePayment
  quote: PaymentQuote
  razorpay?: { order_id: string; key_id: string; amount: number; currency: string }
  online_enabled: boolean
}> {
  if (input.idempotency_key) {
    const ex = await pool.query(`SELECT * FROM student_fee_payments WHERE idempotency_key = $1`, [
      input.idempotency_key,
    ])
    if (ex.rows[0]) {
      const payment = mapPaymentRow(ex.rows[0])
      return {
        payment,
        quote: await buildPaymentQuote({
          fee,
          payment_type: payment.payment_type,
          installment_no: payment.installment_no,
          coupon_code: (payment as StudentFeePayment & { coupon_code?: string }).coupon_code,
          referral_code: (payment as StudentFeePayment & { referral_code?: string }).referral_code,
          student_mobile: payment.student_mobile,
          center_id: input.center_id,
          course_master_id: input.course_master_id,
        }),
        razorpay:
          payment.status === 'pending' && (payment as StudentFeePayment & { gateway_order_id?: string }).gateway_order_id
            ? {
                order_id: String((payment as StudentFeePayment & { gateway_order_id?: string }).gateway_order_id),
                key_id: process.env.RAZORPAY_KEY_ID || '',
                amount: Math.round(Number(payment.amount_due) * 100),
                currency: 'INR',
              }
            : undefined,
        online_enabled: isOnlinePaymentEnabled(),
      }
    }
  }

  const paymentType = input.payment_type || 'lumpsum'
  const installmentNo = paymentType === 'installment' ? input.installment_no ?? null : null
  const settings = await getEnrollmentSettings(input.center_id)

  if (paymentType === 'installment' && installmentNo) {
    const maxInst = Math.min(Number(fee.num_installments) || 1, settings.max_installments, 12)
    if (installmentNo > maxInst) throw new Error(`Installment #${installmentNo} is not available for this programme.`)
  }

  // Admin-configured checkout form + terms (public checkout only).
  const formData: Record<string, string> = {}
  if (input.manual_complete !== true) {
    for (const field of settings.form_fields.filter((f) => f.enabled)) {
      const raw = field.key === 'student_email' ? input.student_email : input.form_data?.[field.key]
      const value = String(raw ?? '').trim().slice(0, 500)
      if (field.required && !value) throw new Error(`${field.label} is required.`)
      if (value && field.key !== 'student_email') formData[field.key] = value
    }
    if (settings.require_terms && !input.terms_accepted) {
      throw new Error('Please accept the terms and refund policy to continue.')
    }
  }

  if (input.manual_complete !== true) {
    await assertEnrollmentAllowed({
      centerId: input.center_id,
      courseMasterId: input.course_master_id,
      batchId: input.batch_id ?? null,
      studentMobile: input.student_mobile,
      paymentType,
    })
  }
  if (paymentType === 'installment' && installmentNo) {
    await assertInstallmentPayable({
      fee,
      centerId: input.center_id,
      courseMasterId: input.course_master_id,
      studentMobile: input.student_mobile,
      installmentNo,
    })
  }

  const quote = await buildPaymentQuote({
    fee,
    payment_type: paymentType,
    installment_no: installmentNo,
    coupon_code: input.coupon_code,
    referral_code: input.referral_code,
    student_mobile: input.student_mobile,
    center_id: input.center_id,
    course_master_id: input.course_master_id,
  })

  const manual = input.manual_complete === true
  if (!manual && !isOnlinePaymentEnabled()) {
    throw new Error('Online payment is not configured. Contact the center to pay offline.')
  }

  const receiptNo = await generateSequentialReceiptNo(input.center_id)
  const insert = await pool.query(
    `INSERT INTO student_fee_payments (
       receipt_no, center_id, course_master_id, batch_id, student_name, student_email, student_mobile,
       payment_type, installment_no, fee_snapshot, amount_due, amount_paid, discount_applied,
       payment_method, transaction_id, status, notes, idempotency_key, coupon_code, discount_id,
       gst_amount, gst_rate, created_by, client_ip,
       referral_code, referral_discount, scholarship_discount, scholarship_tier_id, form_data, terms_accepted_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30) RETURNING *`,
    [
      receiptNo,
      input.center_id,
      input.course_master_id,
      input.batch_id ?? null,
      input.student_name,
      input.student_email ?? null,
      input.student_mobile,
      paymentType,
      installmentNo,
      JSON.stringify({ ...fee, batch_id: input.batch_id ?? null }),
      quote.amount_due,
      manual ? quote.amount_due : 0,
      quote.total_discount,
      input.payment_method ?? (manual ? 'cash' : 'razorpay'),
      input.transaction_id ?? null,
      manual ? 'completed' : 'pending',
      input.notes ?? null,
      input.idempotency_key ?? null,
      quote.coupon_code,
      quote.discount_id,
      quote.gst_amount,
      quote.gst_rate,
      input.created_by ?? null,
      input.client_ip ?? null,
      quote.referral_code,
      quote.referral_discount,
      quote.scholarship_discount,
      quote.scholarship_tier_id,
      Object.keys(formData).length ? JSON.stringify(formData) : null,
      input.terms_accepted ? new Date() : null,
    ]
  )

  let payment = mapPaymentRow(insert.rows[0])
  if (manual) {
    await syncInstallments(payment, fee)
    payment = await afterPaymentCompleted(payment, { manual: true })
    return { payment, quote, online_enabled: isOnlinePaymentEnabled() }
  }

  const keyId = process.env.RAZORPAY_KEY_ID!
  const order = await createRazorpayOrder({
    amountPaise: Math.round(quote.amount_due * 100),
    receipt: receiptNo,
    notes: { payment_id: String(payment.id) },
  })
  await pool.query(`UPDATE student_fee_payments SET gateway_order_id = $1 WHERE id = $2`, [order.id, payment.id])
  payment = { ...payment, gateway_order_id: order.id } as StudentFeePayment

  return {
    payment,
    quote,
    razorpay: { order_id: order.id, key_id: keyId, amount: order.amount, currency: order.currency },
    online_enabled: true,
  }
}

export async function completePaymentFromGateway(input: {
  paymentId: number
  transactionId: string
  gatewayResponse?: Record<string, unknown>
}): Promise<StudentFeePayment> {
  const existing = await pool.query(`SELECT * FROM student_fee_payments WHERE id = $1`, [input.paymentId])
  if (!existing.rows[0]) throw new Error('Payment not found')
  if (existing.rows[0].status === 'completed') return mapPaymentRow(existing.rows[0])

  const dup = await pool.query(
    `SELECT id FROM student_fee_payments WHERE transaction_id = $1 AND id <> $2`,
    [input.transactionId, input.paymentId]
  )
  if (dup.rows[0]) throw new Error('Duplicate transaction')

  const result = await pool.query(
    `UPDATE student_fee_payments SET status = 'completed', transaction_id = $2,
       amount_paid = amount_due, gateway_response = $3::jsonb, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [input.paymentId, input.transactionId, JSON.stringify(input.gatewayResponse || {})]
  )
  const payment = mapPaymentRow(result.rows[0])
  const fee = payment.fee_snapshot as FeeStructureInput
  await syncInstallments(payment, fee)
  return afterPaymentCompleted(payment, { manual: false })
}

export async function markPaymentFailed(paymentId: number): Promise<void> {
  await pool.query(
    `UPDATE student_fee_payments SET status = 'failed', updated_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
    [paymentId]
  )
}

export async function refundPayment(paymentId: number, notes?: string): Promise<StudentFeePayment> {
  const result = await pool.query(
    `UPDATE student_fee_payments SET status = 'refunded', refunded_at = NOW(),
       notes = COALESCE(notes,'') || $2, updated_at = NOW()
     WHERE id = $1 AND status = 'completed' RETURNING *`,
    [paymentId, notes ? `\nRefund: ${notes}` : '']
  )
  if (!result.rows[0]) throw new Error('Payment not found or not refundable')
  await pool.query(
    `UPDATE student_payment_installments SET status = 'unpaid', paid_amount = 0, paid_date = NULL WHERE payment_id = $1`,
    [paymentId]
  )
  return mapPaymentRow(result.rows[0])
}

export async function validateAdminPaymentBody(input: {
  center_id: number
  course_master_id: number
  student_mobile: string
  payment_type: 'lumpsum' | 'installment'
  installment_no?: number | null
  amount_paid: number
  coupon_code?: string | null
  fee: ResolvedCenterFee
}): Promise<PaymentQuote> {
  const quote = await buildPaymentQuote({
    fee: input.fee,
    payment_type: input.payment_type,
    installment_no: input.installment_no,
    coupon_code: input.coupon_code,
    center_id: input.center_id,
    course_master_id: input.course_master_id,
  })
  if (input.payment_type === 'installment' && input.installment_no) {
    await assertInstallmentPayable({
      fee: input.fee,
      centerId: input.center_id,
      courseMasterId: input.course_master_id,
      studentMobile: input.student_mobile,
      installmentNo: input.installment_no,
    })
  }
  if (Math.abs(input.amount_paid - quote.amount_due) > 1) {
    throw new Error(`Amount must be ₹${quote.amount_due.toLocaleString('en-IN')}.`)
  }
  return quote
}


/**
 * Server-side enrollment guards for public checkout. Batch rules (active,
 * enrollment deadline, seat capacity) come from course_master_batches and
 * are managed by admins; nothing here is hardcoded per centre.
 */
export async function assertEnrollmentAllowed(input: {
  centerId: number
  courseMasterId: number
  batchId: number | null
  studentMobile: string
  paymentType: 'lumpsum' | 'installment'
}): Promise<void> {
  const mobile = normMobile(input.studentMobile)

  if (input.batchId) {
    const b = await pool.query(
      `SELECT id, course_master_id, is_active, capacity, enrollment_deadline
       FROM course_master_batches WHERE id = $1`,
      [input.batchId]
    )
    const batch = b.rows[0]
    if (!batch || Number(batch.course_master_id) !== Number(input.courseMasterId)) {
      throw new Error('Selected batch does not belong to this programme.')
    }
    if (batch.is_active === false || batch.is_active === 0) {
      throw new Error('This batch is no longer open for enrollment.')
    }
    if (batch.enrollment_deadline) {
      const deadline = new Date(batch.enrollment_deadline)
      deadline.setHours(23, 59, 59, 999)
      if (!Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now()) {
        throw new Error('Enrollment for this batch has closed.')
      }
    }
    // Seat limit: centre override (batch_seat_limits) falls back to batch capacity.
    await assertSeatAvailable(input.centerId, Number(input.batchId), mobile)
  }

  if (input.paymentType === 'lumpsum' && mobile) {
    const d = await pool.query(
      `SELECT id FROM student_fee_payments
       WHERE center_id = $1 AND course_master_id = $2 AND status = 'completed'
         AND payment_type = 'lumpsum' AND RIGHT(student_mobile, 10) = $3 LIMIT 1`,
      [input.centerId, input.courseMasterId, mobile]
    )
    if (d.rows[0]) {
      throw new Error('You are already enrolled in this programme at this centre. Check the Student Portal for your receipt.')
    }
  }
}
