/**
 * Enrollment business rules shared by the public checkout and admin tools:
 * promo validity windows / usage limits, scholarship and referral discounts,
 * seat limits + waitlist, approval workflow, partial refunds and batch transfers.
 * Everything is driven by admin-managed rows; nothing is hardcoded per centre.
 */
import pool from '@/lib/db'
import { getEnrollmentSettings, type EnrollmentSettings } from '@/lib/enrollment-settings'

export type DiscountRule = { discount_type: 'percent' | 'fixed'; discount_value: number }

export class EnrollmentError extends Error {
  code: string
  extra?: Record<string, unknown>
  constructor(message: string, code: string, extra?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.extra = extra
  }
}

export const normMobile = (m?: string | null) => String(m || '').replace(/\D/g, '').slice(-10)

export function applyDiscountRule(base: number, rule: DiscountRule, allowFixed: boolean): number {
  const value = Number(rule.discount_value) || 0
  if (value <= 0 || base <= 0) return 0
  if (rule.discount_type === 'percent') return Math.min(base, Math.round((base * Math.min(value, 100)) / 100))
  return allowFixed ? Math.min(base, Math.round(value)) : 0
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ------------------------------------------------------------------ promos */

export type CouponStatus = 'none' | 'applied' | 'invalid' | 'not_started' | 'expired' | 'exhausted' | 'limit_reached' | 'min_amount'

export type CouponCheck = {
  status: CouponStatus
  message: string | null
  discount: (DiscountRule & { id: number; coupon_code: string; name: string }) | null
}

export async function checkCoupon(input: {
  courseMasterId: number
  centerId: number
  code?: string | null
  mobile?: string | null
  subtotal: number
}): Promise<CouponCheck> {
  const code = String(input.code || '').trim()
  if (!code) return { status: 'none', message: null, discount: null }
  const r = await pool.query(
    `SELECT * FROM course_fee_discounts
     WHERE is_active = 1 AND course_master_id = $1 AND UPPER(TRIM(coupon_code)) = UPPER($2)
       AND (center_id IS NULL OR center_id = $3)
     ORDER BY CASE WHEN center_id IS NULL THEN 1 ELSE 0 END, id DESC LIMIT 1`,
    [input.courseMasterId, code, input.centerId]
  )
  const row = r.rows[0]
  if (!row) return { status: 'invalid', message: 'This coupon is not valid for this programme at this centre.', discount: null }
  const now = Date.now()
  if (row.starts_at && new Date(row.starts_at).getTime() > now) {
    return { status: 'not_started', message: `This coupon is valid from ${fmtDate(new Date(row.starts_at))}.`, discount: null }
  }
  if (row.ends_at && new Date(row.ends_at).getTime() < now) {
    return { status: 'expired', message: 'This coupon has expired.', discount: null }
  }
  if (row.min_amount != null && Number(row.min_amount) > 0 && input.subtotal < Number(row.min_amount)) {
    return { status: 'min_amount', message: `This coupon needs a minimum payable amount of Rs.${Number(row.min_amount).toLocaleString('en-IN')}.`, discount: null }
  }
  if (row.usage_limit != null && Number(row.usage_limit) > 0) {
    const u = await pool.query(
      `SELECT COUNT(*) AS n FROM student_fee_payments WHERE discount_id = $1 AND status = 'completed'`,
      [row.id]
    )
    if (Number(u.rows[0]?.n || 0) >= Number(row.usage_limit)) {
      return { status: 'exhausted', message: 'This coupon has reached its usage limit.', discount: null }
    }
  }
  const mobile = normMobile(input.mobile)
  if (row.per_mobile_limit != null && Number(row.per_mobile_limit) > 0 && mobile) {
    const u = await pool.query(
      `SELECT COUNT(*) AS n FROM student_fee_payments
       WHERE discount_id = $1 AND status = 'completed' AND RIGHT(student_mobile, 10) = $2`,
      [row.id, mobile]
    )
    if (Number(u.rows[0]?.n || 0) >= Number(row.per_mobile_limit)) {
      return { status: 'limit_reached', message: 'You have already used this coupon.', discount: null }
    }
  }
  return {
    status: 'applied',
    message: `${row.name || 'Coupon'} applied.`,
    discount: {
      id: Number(row.id),
      coupon_code: String(row.coupon_code || code).toUpperCase(),
      name: String(row.name || ''),
      discount_type: row.discount_type === 'fixed' ? 'fixed' : 'percent',
      discount_value: Number(row.discount_value) || 0,
    },
  }
}

/* ------------------------------------------------------------ scholarship */

export type ScholarshipMatch = {
  tier_id: number
  tier_name: string
  rule: DiscountRule
  score_pct: number
  test_name: string | null
}

export async function findScholarship(input: {
  centerId: number
  courseMasterId: number
  mobile?: string | null
}): Promise<ScholarshipMatch | null> {
  const mobile = normMobile(input.mobile)
  if (!mobile) return null
  const res = await pool.query(
    `SELECT * FROM scholarship_results
     WHERE center_id = $1 AND RIGHT(student_mobile, 10) = $2
       AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
     ORDER BY (score / CASE WHEN max_score > 0 THEN max_score ELSE 100 END) DESC LIMIT 1`,
    [input.centerId, mobile]
  )
  const best = res.rows[0]
  if (!best) return null
  const max = Number(best.max_score) > 0 ? Number(best.max_score) : 100
  const pct = Math.round((Number(best.score) / max) * 10000) / 100
  const tiers = await pool.query(
    `SELECT * FROM scholarship_tiers
     WHERE is_active = 1 AND center_key IN (0, $1)
       AND (course_master_id IS NULL OR course_master_id = $2)
       AND min_score <= $3 AND max_score >= $3
     ORDER BY center_key DESC, CASE WHEN course_master_id IS NULL THEN 1 ELSE 0 END, discount_value DESC LIMIT 1`,
    [input.centerId, input.courseMasterId, pct]
  )
  const t = tiers.rows[0]
  if (!t) return null
  return {
    tier_id: Number(t.id),
    tier_name: String(t.name),
    rule: { discount_type: t.discount_type === 'fixed' ? 'fixed' : 'percent', discount_value: Number(t.discount_value) || 0 },
    score_pct: pct,
    test_name: best.test_name || null,
  }
}

/* --------------------------------------------------------------- referral */

export type ReferralCheck = {
  status: 'none' | 'applied' | 'invalid' | 'expired' | 'exhausted' | 'self' | 'disabled'
  message: string | null
  code: string | null
  rule: DiscountRule | null
}

export async function checkReferral(input: {
  centerId: number
  code?: string | null
  mobile?: string | null
  settings: EnrollmentSettings
}): Promise<ReferralCheck> {
  const code = String(input.code || '').trim().toUpperCase()
  if (!code) return { status: 'none', message: null, code: null, rule: null }
  if (!input.settings.referral_enabled) {
    return { status: 'disabled', message: 'Referral codes are not accepted at this centre right now.', code: null, rule: null }
  }
  const r = await pool.query(`SELECT * FROM referral_codes WHERE UPPER(code) = $1 AND center_id = $2 LIMIT 1`, [code, input.centerId])
  const row = r.rows[0]
  if (!row || !(row.is_active === 1 || row.is_active === true)) {
    return { status: 'invalid', message: 'This referral code is not valid at this centre.', code: null, rule: null }
  }
  if (row.expires_at) {
    const end = new Date(row.expires_at)
    end.setHours(23, 59, 59, 999)
    if (end.getTime() < Date.now()) return { status: 'expired', message: 'This referral code has expired.', code: null, rule: null }
  }
  const mobile = normMobile(input.mobile)
  if (mobile && normMobile(row.owner_mobile) === mobile) {
    return { status: 'self', message: 'You cannot use your own referral code.', code: null, rule: null }
  }
  if (row.usage_limit != null && Number(row.usage_limit) > 0) {
    const u = await pool.query(
      `SELECT COUNT(*) AS n FROM student_fee_payments WHERE UPPER(referral_code) = $1 AND center_id = $2 AND status = 'completed'`,
      [code, input.centerId]
    )
    if (Number(u.rows[0]?.n || 0) >= Number(row.usage_limit)) {
      return { status: 'exhausted', message: 'This referral code has reached its usage limit.', code: null, rule: null }
    }
  }
  return {
    status: 'applied',
    message: row.owner_name ? `Referred by ${row.owner_name}.` : 'Referral applied.',
    code,
    rule: { discount_type: row.discount_type === 'percent' ? 'percent' : 'fixed', discount_value: Number(row.discount_value) || 0 },
  }
}

/* ------------------------------------------------------------------ seats */

export type SeatInfo = { capacity: number | null; taken: number; left: number | null; waitlist: number; override: number | null; base: number | null }

export async function getBatchSeatInfo(centerId: number, batchIds: number[]): Promise<Record<number, SeatInfo>> {
  const ids = Array.from(new Set(batchIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)))
  const out: Record<number, SeatInfo> = {}
  if (!ids.length) return out
  const ph = ids.map((_, i) => `$${i + 2}`).join(',')
  const caps = await pool.query(
    `SELECT b.id, b.capacity AS base_capacity, l.capacity AS override_capacity
     FROM course_master_batches b
     LEFT JOIN batch_seat_limits l ON l.batch_id = b.id AND l.center_id = $1
     WHERE b.id IN (${ph})`,
    [centerId, ...ids]
  )
  const taken = await pool.query(
    `SELECT batch_id, COUNT(DISTINCT RIGHT(student_mobile, 10)) AS n FROM student_fee_payments
     WHERE center_id = $1 AND batch_id IN (${ph}) AND status = 'completed'
       AND (approval_status IS NULL OR approval_status <> 'rejected')
     GROUP BY batch_id`,
    [centerId, ...ids]
  )
  const wait = await pool.query(
    `SELECT batch_id, COUNT(*) AS n FROM enrollment_waitlist
     WHERE center_id = $1 AND batch_id IN (${ph}) AND status = 'waiting' GROUP BY batch_id`,
    [centerId, ...ids]
  )
  const takenMap = new Map(taken.rows.map((r: Record<string, unknown>) => [Number(r.batch_id), Number(r.n)]))
  const waitMap = new Map(wait.rows.map((r: Record<string, unknown>) => [Number(r.batch_id), Number(r.n)]))
  for (const row of caps.rows) {
    const id = Number(row.id)
    const override = row.override_capacity != null ? Number(row.override_capacity) : null
    const base = row.base_capacity != null ? Number(row.base_capacity) : null
    const cap = override != null ? override : base
    const capacity = cap && cap > 0 ? cap : null
    const t = takenMap.get(id) || 0
    out[id] = { capacity, taken: t, left: capacity == null ? null : Math.max(0, capacity - t), waitlist: waitMap.get(id) || 0, override, base }
  }
  return out
}

export async function mobileHoldsSeat(centerId: number, batchId: number, mobile: string): Promise<boolean> {
  const m = normMobile(mobile)
  if (!m) return false
  const r = await pool.query(
    `SELECT id FROM student_fee_payments
     WHERE center_id = $1 AND batch_id = $2 AND status = 'completed' AND RIGHT(student_mobile, 10) = $3
       AND (approval_status IS NULL OR approval_status <> 'rejected') LIMIT 1`,
    [centerId, batchId, m]
  )
  return Boolean(r.rows[0])
}

export async function assertSeatAvailable(centerId: number, batchId: number | null, mobile: string): Promise<void> {
  if (!batchId) return
  const info = (await getBatchSeatInfo(centerId, [batchId]))[batchId]
  if (!info || info.left == null || info.left > 0) return
  if (await mobileHoldsSeat(centerId, batchId, mobile)) return
  const settings = await getEnrollmentSettings(centerId)
  throw new EnrollmentError(
    settings.waitlist_enabled
      ? 'This batch is full. Join the waitlist and we will contact you if a seat opens up.'
      : 'This batch is full. Please choose another batch or contact the centre.',
    'BATCH_FULL',
    { waitlist_enabled: settings.waitlist_enabled, batch_id: batchId }
  )
}

export async function addToWaitlist(input: {
  centerId: number
  courseMasterId: number
  batchId: number | null
  name: string
  mobile: string
  email?: string | null
}): Promise<{ id: number; position: number; already: boolean }> {
  const mobile = normMobile(input.mobile)
  const existing = await pool.query(
    `SELECT id FROM enrollment_waitlist WHERE center_id = $1 AND course_master_id = $2
       AND COALESCE(batch_id, 0) = $3 AND student_mobile = $4`,
    [input.centerId, input.courseMasterId, input.batchId || 0, mobile]
  )
  let id: number
  let already = false
  if (existing.rows[0]) {
    id = Number(existing.rows[0].id)
    already = true
    await pool.query(`UPDATE enrollment_waitlist SET status = 'waiting', student_name = $2, student_email = $3 WHERE id = $1`, [id, input.name, input.email || null])
  } else {
    const ins = await pool.query(
      `INSERT INTO enrollment_waitlist (center_id, course_master_id, batch_id, student_name, student_mobile, student_email)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [input.centerId, input.courseMasterId, input.batchId, input.name, mobile, input.email || null]
    )
    id = Number(ins.rows[0].id)
  }
  const pos = await pool.query(
    `SELECT COUNT(*) AS n FROM enrollment_waitlist WHERE center_id = $1 AND course_master_id = $2
       AND COALESCE(batch_id, 0) = $3 AND status = 'waiting' AND id <= $4`,
    [input.centerId, input.courseMasterId, input.batchId || 0, id]
  )
  return { id, position: Number(pos.rows[0]?.n || 1), already }
}

/* ------------------------------------------------------- discount stack */

export type DiscountStack = {
  coupon: CouponCheck
  coupon_discount: number
  scholarship: ScholarshipMatch | null
  scholarship_discount: number
  referral: ReferralCheck
  referral_discount: number
  total: number
}

export async function computeDiscountStack(input: {
  centerId: number
  courseMasterId: number
  subtotal: number
  allowFixed: boolean
  couponCode?: string | null
  referralCode?: string | null
  mobile?: string | null
  settings?: EnrollmentSettings
}): Promise<DiscountStack> {
  const settings = input.settings || (await getEnrollmentSettings(input.centerId))
  const base = Math.max(0, input.subtotal)
  const coupon = await checkCoupon({ courseMasterId: input.courseMasterId, centerId: input.centerId, code: input.couponCode, mobile: input.mobile, subtotal: base })
  const scholarship = settings.scholarship_enabled
    ? await findScholarship({ centerId: input.centerId, courseMasterId: input.courseMasterId, mobile: input.mobile })
    : null
  const referral = await checkReferral({ centerId: input.centerId, code: input.referralCode, mobile: input.mobile, settings })

  let c = coupon.discount ? applyDiscountRule(base, coupon.discount, input.allowFixed) : 0
  let s = scholarship ? applyDiscountRule(base, scholarship.rule, input.allowFixed) : 0
  let r = referral.rule ? applyDiscountRule(base, referral.rule, input.allowFixed) : 0

  if (!settings.allow_stacking) {
    const best = Math.max(c, s, r)
    if (best === c) { s = 0; r = 0 } else if (best === s) { c = 0; r = 0 } else { c = 0; s = 0 }
  } else {
    // Apply sequentially so the total never exceeds the base.
    s = Math.min(s, Math.max(0, base - c))
    r = Math.min(r, Math.max(0, base - c - s))
  }
  if (coupon.status === 'applied' && c === 0 && coupon.discount) {
    coupon.message = settings.allow_stacking || !(s || r)
      ? 'Fixed-amount coupons apply to the full payment or the first installment only.'
      : 'A larger discount is already applied; offers cannot be combined.'
  }
  return { coupon, coupon_discount: c, scholarship, scholarship_discount: s, referral, referral_discount: r, total: c + s + r }
}

/* --------------------------------------------------------------- approval */

export async function applyApprovalOnCompletion(payment: { id: number; center_id: number; payment_type: string; installment_no?: number | null }): Promise<'pending' | 'auto'> {
  const settings = await getEnrollmentSettings(payment.center_id)
  const first = payment.payment_type === 'lumpsum' || !payment.installment_no || Number(payment.installment_no) === 1
  const status: 'pending' | 'auto' = settings.approval_required && first ? 'pending' : 'auto'
  await pool.query(
    `UPDATE student_fee_payments SET approval_status = $2 WHERE id = $1 AND approval_status IS NULL`,
    [payment.id, status]
  )
  return status
}

export async function maybeIssueReferralCode(payment: { center_id: number; student_name?: string | null; student_mobile: string }): Promise<string | null> {
  const settings = await getEnrollmentSettings(payment.center_id)
  if (!settings.referral_enabled || !settings.referral_auto_issue) return null
  const mobile = normMobile(payment.student_mobile)
  const ex = await pool.query(`SELECT code FROM referral_codes WHERE center_id = $1 AND owner_mobile = $2 LIMIT 1`, [payment.center_id, mobile])
  if (ex.rows[0]) return String(ex.rows[0].code)
  const stem = String(payment.student_name || 'REF').replace(/[^A-Za-z]/g, '').slice(0, 5).toUpperCase() || 'REF'
  for (let i = 0; i < 5; i++) {
    const code = `${stem}${Math.floor(1000 + Math.random() * 9000)}`
    try {
      await pool.query(
        `INSERT INTO referral_codes (center_id, code, owner_name, owner_mobile, discount_type, discount_value) VALUES ($1,$2,$3,$4,$5,$6)`,
        [payment.center_id, code, payment.student_name || null, mobile, settings.referral_reward_type, settings.referral_reward_value]
      )
      return code
    } catch {
      /* code collision, retry */
    }
  }
  return null
}

export async function decideApproval(input: { paymentId: number; centerId: number | null; action: 'approve' | 'reject'; note?: string | null; actor: string | null }) {
  const r = await pool.query(`SELECT * FROM student_fee_payments WHERE id = $1`, [input.paymentId])
  const p = r.rows[0]
  if (!p || (input.centerId && Number(p.center_id) !== Number(input.centerId))) throw new Error('Payment not found')
  if (p.approval_status !== 'pending') throw new Error('This enrollment is not awaiting approval.')
  const status = input.action === 'approve' ? 'approved' : 'rejected'
  await pool.query(
    `UPDATE student_fee_payments SET approval_status = $2, approved_by = $3, approved_at = NOW(), approval_note = $4 WHERE id = $1`,
    [input.paymentId, status, input.actor, input.note || null]
  )
  const { enqueueNotification } = await import('@/lib/notification-queue')
  const course = await pool.query(`SELECT title FROM course_masters WHERE id = $1`, [p.course_master_id])
  const title = course.rows[0]?.title || 'your programme'
  const msg =
    status === 'approved'
      ? `Your enrollment for ${title} (receipt ${p.receipt_no}) is confirmed. Welcome aboard!`
      : `Your enrollment request for ${title} (receipt ${p.receipt_no}) could not be confirmed.${input.note ? ` Reason: ${input.note}.` : ''} Your refund will be processed by the centre.`
  for (const ch of ['sms', 'whatsapp'] as const) {
    await enqueueNotification({ centerId: Number(p.center_id), channel: ch, recipient: p.student_mobile, body: msg, kind: `approval_${status}`, dedupeKey: `approval:${p.id}:${status}:${ch}` })
  }
  if (p.student_email) {
    await enqueueNotification({ centerId: Number(p.center_id), channel: 'email', recipient: p.student_email, subject: status === 'approved' ? 'Enrollment confirmed' : 'Enrollment update', body: msg, kind: `approval_${status}`, dedupeKey: `approval:${p.id}:${status}:email` })
  }
  if (status === 'approved') {
    const { ensureStudentAccountFromPayment } = await import('@/lib/student-account-provisioning')
    await ensureStudentAccountFromPayment({ ...p, approval_status: 'approved' })
    await maybeIssueReferralCode(p)
  }
  return { id: input.paymentId, approval_status: status }
}

/* ------------------------------------------------- refunds & transfers */

export async function recordPartialRefund(input: {
  paymentId: number
  centerId: number | null
  amount: number
  reason?: string | null
  method?: string | null
  reference?: string | null
  actor: string | null
}) {
  const r = await pool.query(`SELECT * FROM student_fee_payments WHERE id = $1`, [input.paymentId])
  const p = r.rows[0]
  if (!p || (input.centerId && Number(p.center_id) !== Number(input.centerId))) throw new Error('Payment not found')
  if (p.status !== 'completed') throw new Error('Only completed payments can be refunded.')
  const paid = Number(p.amount_paid) || 0
  const already = Number(p.refunded_amount) || 0
  const amount = Math.round(Number(input.amount) * 100) / 100
  if (!(amount > 0)) throw new Error('Refund amount must be greater than zero.')
  if (amount > paid - already + 0.01) throw new Error(`Refund exceeds the refundable balance (Rs.${(paid - already).toLocaleString('en-IN')}).`)
  await pool.query(
    `INSERT INTO payment_refunds (payment_id, center_id, amount, reason, method, reference, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [p.id, p.center_id, amount, input.reason || null, input.method || null, input.reference || null, input.actor]
  )
  const total = already + amount
  await pool.query(`UPDATE student_fee_payments SET refunded_amount = $2, updated_at = NOW() WHERE id = $1`, [p.id, total])
  let full = false
  if (total >= paid - 0.01) {
    const { refundPayment } = await import('@/lib/course-fees-payments')
    await refundPayment(Number(p.id), input.reason || 'Full refund recorded')
    full = true
  }
  const { enqueueNotification } = await import('@/lib/notification-queue')
  await enqueueNotification({
    centerId: Number(p.center_id), channel: 'sms', recipient: p.student_mobile, kind: 'refund',
    body: `A refund of Rs.${amount.toLocaleString('en-IN')} has been recorded against receipt ${p.receipt_no}.`,
    dedupeKey: `refund:${p.id}:${total}`,
  })
  return { payment_id: p.id, refunded_amount: total, full }
}

export async function transferBatch(input: {
  centerId: number
  courseMasterId: number
  mobile: string
  toBatchId: number
  reason?: string | null
  actor: string | null
}) {
  const mobile = normMobile(input.mobile)
  const b = await pool.query(`SELECT * FROM course_master_batches WHERE id = $1`, [input.toBatchId])
  const batch = b.rows[0]
  if (!batch || Number(batch.course_master_id) !== Number(input.courseMasterId)) throw new Error('Target batch must belong to the same programme.')
  if (!(batch.is_active === 1 || batch.is_active === true)) throw new Error('Target batch is not active.')
  const pays = await pool.query(
    `SELECT id, batch_id, student_name, student_email FROM student_fee_payments
     WHERE center_id = $1 AND course_master_id = $2 AND RIGHT(student_mobile, 10) = $3 AND status = 'completed'
     ORDER BY id`,
    [input.centerId, input.courseMasterId, mobile]
  )
  if (!pays.rows.length) throw new Error('No completed enrollment found for this student in this programme.')
  const fromBatch = pays.rows[pays.rows.length - 1].batch_id ?? null
  if (fromBatch && Number(fromBatch) === Number(input.toBatchId)) throw new Error('Student is already in this batch.')
  await assertSeatAvailable(input.centerId, input.toBatchId, '0000000000')
  await pool.query(
    `UPDATE student_fee_payments SET batch_id = $4, updated_at = NOW()
     WHERE center_id = $1 AND course_master_id = $2 AND RIGHT(student_mobile, 10) = $3`,
    [input.centerId, input.courseMasterId, mobile, input.toBatchId]
  )
  await pool.query(
    `INSERT INTO batch_transfers (center_id, course_master_id, student_mobile, student_name, from_batch_id, to_batch_id, reason, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [input.centerId, input.courseMasterId, mobile, pays.rows[0].student_name, fromBatch, input.toBatchId, input.reason || null, input.actor]
  )
  const { enqueueNotification } = await import('@/lib/notification-queue')
  await enqueueNotification({
    centerId: input.centerId, channel: 'sms', recipient: mobile, kind: 'batch_transfer',
    body: `You have been moved to batch "${batch.batch_name || `#${batch.id}`}". Contact the centre for any questions.`,
    dedupeKey: `transfer:${input.centerId}:${mobile}:${input.toBatchId}:${Date.now()}`,
  })
  return { from_batch_id: fromBatch, to_batch_id: input.toBatchId, payments_updated: pays.rows.length }
}
