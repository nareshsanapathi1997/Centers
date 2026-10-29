export type InstallmentDueRule = {
  installment_no: number
  due_days?: number | null
  due_date?: string | null
  label?: string | null
  /** Amount for installments 4-12 (1-3 use installment_N_amount columns). */
  amount?: number | null
}

export type FeeStructureInput = {
  total_amount: number
  offer_amount?: number | null
  discount_amount?: number | null
  registration_fee?: number | null
  num_installments?: number
  installment_1_amount?: number | null
  installment_2_amount?: number | null
  installment_3_amount?: number | null
  installment_due_rules?: InstallmentDueRule[]
  offer_enabled?: boolean
  payment_rules?: Record<string, unknown>
  is_active?: boolean
}

export type CourseBaseFee = FeeStructureInput & {
  id: number
  course_master_id: number
  course_title?: string
  course_slug?: string
  created_at?: string
  updated_at?: string
}

export type CourseFeeDiscount = {
  id: number
  course_master_id: number
  center_id?: number | null
  name: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  coupon_code?: string | null
  is_active: boolean
  course_title?: string
  center_name?: string
  created_at?: string
  updated_at?: string
}

export type CourseCenterAssignment = {
  id: number
  course_master_id: number
  center_id: number
  allow_center_override: boolean
  admin_can_customize: boolean
  status: 'active' | 'inactive' | 'pending'
  assigned_at?: string
  course_title?: string
  course_slug?: string
  center_name?: string
  center_slug?: string
  center_fee_status?: string | null
}

export type CourseCenterFee = FeeStructureInput & {
  id: number
  course_master_id: number
  center_id: number
  additional_discounts?: Array<{
    name: string
    discount_type: 'percent' | 'fixed'
    discount_value: number
  }>
  configured_by: 'admin' | 'center'
  status: 'draft' | 'saved' | 'approved' | 'rejected'
  saved_at?: string | null
  approved_at?: string | null
  course_title?: string
  course_slug?: string
  center_name?: string
  created_at?: string
  updated_at?: string
}

export type StudentFeePayment = {
  id: number
  receipt_no: string
  center_id: number
  course_master_id: number
  batch_id?: number | null
  student_name: string
  student_email?: string | null
  student_mobile: string
  payment_type: 'lumpsum' | 'installment'
  installment_no?: number | null
  fee_snapshot: Record<string, unknown>
  amount_due: number
  amount_paid: number
  discount_applied: number
  payment_method?: string | null
  transaction_id?: string | null
  gateway_order_id?: string | null
  coupon_code?: string | null
  gst_amount?: number
  gst_rate?: number
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  notes?: string | null
  course_title?: string
  center_name?: string
  created_at?: string
  refunded_at?: string | null
}

export type CourseBatchBaseFee = CourseBaseFee & {
  batch_id: number
  batch_name?: string | null
}

export type CourseBatchCenterFee = CourseCenterFee & {
  batch_id: number
  batch_name?: string | null
}

export type CourseBatchFeeRow = {
  id: number
  course_master_id: number
  batch_name: string | null
  batch_timing: string | null
  start_date: string
  is_active: boolean
  has_base_fee: boolean
  has_center_fee: boolean
  base_amount: number | null
  center_amount: number | null
}

export type ResolvedCenterFee = FeeStructureInput & {
  batch_id?: number | null
  source: 'center' | 'base' | 'batch_center' | 'batch_base'
  course_master_id: number
  center_id: number
  course_title?: string
  payment_available: boolean
}

export const EMPTY_FEE_FORM: FeeStructureInput = {
  total_amount: 0,
  offer_amount: null,
  discount_amount: 0,
  registration_fee: 0,
  num_installments: 1,
  installment_1_amount: null,
  installment_2_amount: null,
  installment_3_amount: null,
  installment_due_rules: [],
  offer_enabled: true,
  payment_rules: {},
  is_active: true,
}

export function generateReceiptNo(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `RCP-${ts}-${rand}`
}

export function computeEffectiveAmount(fee: FeeStructureInput): number {
  const total = Number(fee.total_amount) || 0
  const discount = Number(fee.discount_amount) || 0
  if (fee.offer_enabled && fee.offer_amount != null && fee.offer_amount > 0) {
    return Number(fee.offer_amount)
  }
  return Math.max(0, total - discount)
}
