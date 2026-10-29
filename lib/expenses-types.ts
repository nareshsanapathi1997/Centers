export const EXPENSE_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'paid'] as const
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number]

export const APPROVAL_STATUSES = ['approved', 'rejected', 'paid'] as const
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number]

export const EXPENSE_CATEGORIES = [
  'travel',
  'food',
  'office_supplies',
  'utilities',
  'rent',
  'salary',
  'marketing',
  'maintenance',
  'training',
  'transport',
  'communication',
  'miscellaneous',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const EXPENSE_PAYMENT_METHODS = [
  'cash',
  'upi',
  'bank_transfer',
  'cheque',
  'card',
  'other',
] as const
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number]

export type ExpenseRow = {
  id: number
  center_id: number
  employee_id: number
  category: ExpenseCategory
  amount: string | number
  expense_date: string
  description: string | null
  receipt_url: string | null
  receipt_name: string | null
  payment_method: ExpensePaymentMethod
  status: ExpenseStatus
  approval_notes: string | null
  notes: string | null
  created_at: string
  updated_at: string
  employee_name?: string
  employee_code?: string | null
  center_name?: string
  center_slug?: string
}

export type ExpenseSummary = {
  total_amount: number
  total_count: number
  this_month_amount: number
  this_month_count: number
  pending_amount: number
  pending_count: number
  approved_amount: number
  approved_count: number
  rejected_amount: number
  rejected_count: number
  paid_amount: number
  paid_count: number
  draft_amount: number
  draft_count: number
}

export type EmployeeExpenseSummary = {
  employee_id: number
  employee_name: string
  employee_code: string | null
  total_amount: number
  approved_amount: number
  pending_amount: number
  rejected_amount: number
  expense_count: number
}

export type CategoryExpenseSummary = {
  category: ExpenseCategory
  total_amount: number
  expense_count: number
}

export function isApprovalStatus(status: string | null | undefined): status is ApprovalStatus {
  return APPROVAL_STATUSES.includes(status as ApprovalStatus)
}

export function toAmountNumber(value: string | number | null | undefined): number {
  if (value == null) return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}
