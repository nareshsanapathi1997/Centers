import type { FeeStructureInput, StudentFeePayment } from '@/lib/course-fees-types'
import { computeEffectiveAmount } from '@/lib/course-fees-types'

export function formatInr(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return '—'
  return `₹${amount.toLocaleString('en-IN')}`
}

export function feeInputFromRow(fee: FeeStructureInput): FeeStructureInput {
  return {
    total_amount: fee.total_amount,
    offer_amount: fee.offer_amount,
    discount_amount: fee.discount_amount,
    registration_fee: fee.registration_fee,
    num_installments: fee.num_installments,
    installment_1_amount: fee.installment_1_amount,
    installment_2_amount: fee.installment_2_amount,
    installment_3_amount: fee.installment_3_amount,
    installment_due_rules: fee.installment_due_rules || [],
    offer_enabled: fee.offer_enabled,
    payment_rules: fee.payment_rules || {},
    is_active: fee.is_active,
  }
}

/** Course fee + registration fee (what student pays for lumpsum). */
export function computePayableAmount(fee: FeeStructureInput): number {
  const reg = Number(fee.registration_fee) || 0
  return computeEffectiveAmount(fee) + reg
}

export const MAX_INSTALLMENTS = 12

/** Explicit amount configured for installment N (columns for 1-3, due rules for 4-12). */
export function explicitInstallmentAmount(fee: FeeStructureInput, installmentNo: number): number | null {
  const map: Record<number, number | null | undefined> = {
    1: fee.installment_1_amount,
    2: fee.installment_2_amount,
    3: fee.installment_3_amount,
  }
  const col = map[installmentNo]
  if (col != null && Number.isFinite(Number(col)) && Number(col) > 0) return Number(col)
  const rule = fee.installment_due_rules?.find((r) => Number(r.installment_no) === installmentNo)
  if (rule?.amount != null && Number(rule.amount) > 0) return Number(rule.amount)
  return null
}

export function installmentPayAmount(fee: FeeStructureInput, installmentNo: number): number {
  const count = Math.min(Math.max(1, fee.num_installments || 1), MAX_INSTALLMENTS)
  const specific = explicitInstallmentAmount(fee, installmentNo)
  if (specific != null) return specific
  if (installmentNo === 1 && count === 1) return computePayableAmount(fee)
  if (installmentNo > count) return 0
  // Unspecified installments split the remaining balance evenly.
  const effective = computeEffectiveAmount(fee)
  let explicitSum = 0
  let unspecified = 0
  for (let n = 1; n <= count; n++) {
    const v = explicitInstallmentAmount(fee, n)
    if (v != null) explicitSum += v
    else unspecified++
  }
  if (unspecified === 0) return 0
  const share = Math.max(0, Math.round((effective - explicitSum) / unspecified))
  const reg = installmentNo === 1 ? Number(fee.registration_fee) || 0 : 0
  return share + reg || (installmentNo === 1 ? computePayableAmount(fee) : 0)
}

export function validateFeeForm(fee: FeeStructureInput): string | null {
  if ((fee.total_amount ?? 0) <= 0) return 'Total course amount must be greater than zero.'
  const count = fee.num_installments || 1
  if (count > MAX_INSTALLMENTS) return `Maximum ${MAX_INSTALLMENTS} installments are supported.`
  if (count > 1) {
    const parts: number[] = []
    for (let n = 1; n <= count; n++) {
      const v = explicitInstallmentAmount(fee, n)
      if (v != null) parts.push(v)
    }
    if (parts.length === count) {
      const sum = parts.reduce((a, b) => a + b, 0)
      const target = computeEffectiveAmount(fee)
      if (Math.abs(sum - target) > 1) {
        return `Installment amounts (₹${sum.toLocaleString('en-IN')}) should equal course amount after discount (₹${target.toLocaleString('en-IN')}).`
      }
    } else if (parts.length > 0) {
      const sum = parts.reduce((a, b) => a + b, 0)
      if (sum - computeEffectiveAmount(fee) > 1) return 'Installment amounts exceed the course amount after discount.'
    }
  }
  return null
}

export function getGstRateFromPaymentRules(fee: FeeStructureInput): number {
  const rate = Number(fee.payment_rules?.gst_rate ?? process.env.DEFAULT_GST_RATE ?? 18)
  return Number.isFinite(rate) && rate >= 0 ? rate : 18
}

/** Resolve due date for an installment from fee rules (fixed date or days from start). */
export function resolveInstallmentDueDate(
  fee: FeeStructureInput,
  installmentNo: number,
  startDate: Date = new Date()
): Date | null {
  const rule = fee.installment_due_rules?.find((r) => r.installment_no === installmentNo)
  if (!rule) return null
  if (rule.due_date) {
    const d = new Date(rule.due_date)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (rule.due_days != null && rule.due_days >= 0) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + rule.due_days)
    return d
  }
  return null
}

export type InstallmentDueStatus = 'paid' | 'due' | 'overdue' | 'upcoming'

export function getInstallmentDueStatus(dueDate: Date | null, paid: boolean): InstallmentDueStatus {
  if (paid) return 'paid'
  if (!dueDate) return 'upcoming'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  if (due.getTime() < today.getTime()) return 'overdue'
  if (due.getTime() === today.getTime()) return 'due'
  return 'upcoming'
}

export function paymentsToCsv(rows: StudentFeePayment[]): string {
  const header = [
    'Receipt',
    'Student',
    'Mobile',
    'Course',
    'Center',
    'Amount Due',
    'Amount Paid',
    'GST',
    'Discount',
    'Method',
    'Status',
    'Type',
    'Installment',
    'Coupon',
    'Date',
  ]
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = rows.map((p) =>
    [
      p.receipt_no,
      p.student_name,
      p.student_mobile,
      p.course_title,
      p.center_name,
      p.amount_due,
      p.amount_paid,
      p.gst_amount ?? 0,
      p.discount_applied,
      p.payment_method,
      p.status,
      p.payment_type,
      p.installment_no ?? '',
      p.coupon_code ?? '',
      p.created_at ? new Date(p.created_at).toISOString() : '',
    ]
      .map(escape)
      .join(',')
  )
  return [header.join(','), ...lines].join('\n')
}

export function buildPaymentLink(centerSlug: string, courseSlug: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || ''
  const path = `/${centerSlug}/payment/${courseSlug}`
  return base ? `${base.replace(/\/$/, '')}${path}` : path
}
