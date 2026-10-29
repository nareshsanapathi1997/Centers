import pool from '@/lib/db'
import type {
  ApprovalStatus,
  CategoryExpenseSummary,
  EmployeeExpenseSummary,
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseRow,
  ExpenseStatus,
  ExpenseSummary,
} from '@/lib/expenses-types'
import { toAmountNumber } from '@/lib/expenses-types'

export type {
  ApprovalStatus,
  CategoryExpenseSummary,
  EmployeeExpenseSummary,
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseRow,
  ExpenseStatus,
  ExpenseSummary,
} from '@/lib/expenses-types'
export {
  APPROVAL_STATUSES,
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_STATUSES,
  isApprovalStatus,
  toAmountNumber,
} from '@/lib/expenses-types'

export const EXPENSE_COLUMNS = `
  id, center_id, employee_id, category, amount, expense_date, description,
  receipt_url, receipt_name, payment_method, status, approval_notes, notes,
  created_at, updated_at
`

export const EXPENSE_SELECT = `
  x.id, x.center_id, x.employee_id, x.category, x.amount, x.expense_date, x.description,
  x.receipt_url, x.receipt_name, x.payment_method, x.status, x.approval_notes, x.notes,
  x.created_at, x.updated_at
`

export async function getExpenseById(
  id: number,
  centerId?: number
): Promise<ExpenseRow | null> {
  const params: unknown[] = [id]
  let where = 'WHERE x.id = $1'
  if (centerId != null) {
    params.push(centerId)
    where += ` AND x.center_id = $${params.length}`
  }

  const result = await pool.query(
    `SELECT ${EXPENSE_SELECT},
            e.full_name AS employee_name, e.employee_code,
            c.name AS center_name, c.slug AS center_slug
     FROM expenses x
     JOIN employees e ON e.id = x.employee_id
     JOIN centers c ON c.id = x.center_id
     ${where}`,
    params
  )
  return result.rows[0] || null
}

export type ExpenseWriteInput = {
  centerId: number
  employeeId: number
  category: ExpenseCategory
  amount: number
  expenseDate: string
  description?: string | null
  receiptUrl?: string | null
  receiptName?: string | null
  paymentMethod?: ExpensePaymentMethod
  status?: ExpenseStatus
  approvalNotes?: string | null
  notes?: string | null
}

export async function createExpense(input: ExpenseWriteInput): Promise<ExpenseRow> {
  const result = await pool.query(
    `INSERT INTO expenses (
       center_id, employee_id, category, amount, expense_date, description,
       receipt_url, receipt_name, payment_method, status, approval_notes, notes
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
     )
     RETURNING ${EXPENSE_COLUMNS}`,
    [
      input.centerId,
      input.employeeId,
      input.category,
      input.amount,
      input.expenseDate,
      input.description?.trim() || null,
      input.receiptUrl?.trim() || null,
      input.receiptName?.trim() || null,
      input.paymentMethod || 'cash',
      input.status || 'draft',
      input.approvalNotes?.trim() || null,
      input.notes?.trim() || null,
    ]
  )
  return result.rows[0]
}

export async function updateExpense(
  id: number,
  centerId: number,
  input: Partial<ExpenseWriteInput>
): Promise<ExpenseRow | null> {
  const existing = await getExpenseById(id, centerId)
  if (!existing) return null

  const result = await pool.query(
    `UPDATE expenses SET
       employee_id = COALESCE($1, employee_id),
       category = COALESCE($2, category),
       amount = COALESCE($3, amount),
       expense_date = COALESCE($4, expense_date),
       description = $5,
       receipt_url = $6,
       receipt_name = $7,
       payment_method = COALESCE($8, payment_method),
       status = COALESCE($9, status),
       approval_notes = $10,
       notes = $11,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $12 AND center_id = $13
     RETURNING ${EXPENSE_COLUMNS}`,
    [
      input.employeeId || null,
      input.category || null,
      input.amount ?? null,
      input.expenseDate || null,
      input.description !== undefined
        ? input.description?.trim() || null
        : existing.description,
      input.receiptUrl !== undefined
        ? input.receiptUrl?.trim() || null
        : existing.receipt_url,
      input.receiptName !== undefined
        ? input.receiptName?.trim() || null
        : existing.receipt_name,
      input.paymentMethod || null,
      input.status || null,
      input.approvalNotes !== undefined
        ? input.approvalNotes?.trim() || null
        : existing.approval_notes,
      input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
      id,
      centerId,
    ]
  )

  return result.rows[0] || null
}

export async function deleteExpense(id: number, centerId?: number): Promise<boolean> {
  const params: unknown[] = [id]
  let sql = 'DELETE FROM expenses WHERE id = $1'
  if (centerId != null) {
    params.push(centerId)
    sql += ` AND center_id = $${params.length}`
  }
  const result = await pool.query(sql, params)
  return (result.rowCount || 0) > 0
}

export async function assertEmployeeInCenter(
  employeeId: number,
  centerId: number
): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM employees WHERE id = $1 AND center_id = $2`,
    [employeeId, centerId]
  )
  return result.rows.length > 0
}

type SummaryFilter = {
  centerId?: number
  employeeId?: number
  category?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

function buildExpenseFilter(filter: SummaryFilter): { where: string; params: unknown[] } {
  const params: unknown[] = []
  const conditions: string[] = []

  if (filter.centerId != null) {
    params.push(filter.centerId)
    conditions.push(`x.center_id = $${params.length}`)
  }
  if (filter.employeeId != null) {
    params.push(filter.employeeId)
    conditions.push(`x.employee_id = $${params.length}`)
  }
  if (filter.category) {
    params.push(filter.category)
    conditions.push(`x.category = $${params.length}`)
  }
  if (filter.status) {
    params.push(filter.status)
    conditions.push(`x.status = $${params.length}`)
  }
  if (filter.dateFrom) {
    params.push(filter.dateFrom)
    conditions.push(`x.expense_date >= $${params.length}::date`)
  }
  if (filter.dateTo) {
    params.push(filter.dateTo)
    conditions.push(`x.expense_date <= $${params.length}::date`)
  }
  if (filter.search) {
    params.push(`%${filter.search}%`)
    conditions.push(
      `(x.description ILIKE $${params.length} OR e.full_name ILIKE $${params.length} OR e.employee_code ILIKE $${params.length} OR x.notes ILIKE $${params.length})`
    )
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  }
}

export async function getExpenseSummary(filter: SummaryFilter = {}): Promise<ExpenseSummary> {
  const { where, params } = buildExpenseFilter(filter)
  const needsEmployeeJoin = Boolean(filter.search)

  const result = await pool.query(
    `SELECT
       COALESCE(SUM(x.amount), 0)::float AS total_amount,
       COUNT(*)::int AS total_count,
       COALESCE(SUM(x.amount) FILTER (
         WHERE DATE_FORMAT(x.expense_date, '%Y-%m') = DATE_FORMAT(CURRENT_DATE, '%Y-%m')
       ), 0)::float AS this_month_amount,
       COUNT(*) FILTER (
         WHERE DATE_FORMAT(x.expense_date, '%Y-%m') = DATE_FORMAT(CURRENT_DATE, '%Y-%m')
       )::int AS this_month_count,
       COALESCE(SUM(x.amount) FILTER (WHERE x.status = 'pending'), 0)::float AS pending_amount,
       COUNT(*) FILTER (WHERE x.status = 'pending')::int AS pending_count,
       COALESCE(SUM(x.amount) FILTER (WHERE x.status = 'approved'), 0)::float AS approved_amount,
       COUNT(*) FILTER (WHERE x.status = 'approved')::int AS approved_count,
       COALESCE(SUM(x.amount) FILTER (WHERE x.status = 'rejected'), 0)::float AS rejected_amount,
       COUNT(*) FILTER (WHERE x.status = 'rejected')::int AS rejected_count,
       COALESCE(SUM(x.amount) FILTER (WHERE x.status = 'paid'), 0)::float AS paid_amount,
       COUNT(*) FILTER (WHERE x.status = 'paid')::int AS paid_count,
       COALESCE(SUM(x.amount) FILTER (WHERE x.status = 'draft'), 0)::float AS draft_amount,
       COUNT(*) FILTER (WHERE x.status = 'draft')::int AS draft_count
     FROM expenses x
     ${needsEmployeeJoin ? 'JOIN employees e ON e.id = x.employee_id' : ''}
     ${where}`,
    params
  )

  return (
    result.rows[0] || {
      total_amount: 0,
      total_count: 0,
      this_month_amount: 0,
      this_month_count: 0,
      pending_amount: 0,
      pending_count: 0,
      approved_amount: 0,
      approved_count: 0,
      rejected_amount: 0,
      rejected_count: 0,
      paid_amount: 0,
      paid_count: 0,
      draft_amount: 0,
      draft_count: 0,
    }
  )
}

export async function getEmployeeExpenseSummaries(
  filter: SummaryFilter = {}
): Promise<EmployeeExpenseSummary[]> {
  const { where, params } = buildExpenseFilter(filter)
  const result = await pool.query(
    `SELECT
       e.id AS employee_id,
       e.full_name AS employee_name,
       e.employee_code,
       COALESCE(SUM(x.amount), 0)::float AS total_amount,
       COALESCE(SUM(x.amount) FILTER (WHERE x.status IN ('approved', 'paid')), 0)::float AS approved_amount,
       COALESCE(SUM(x.amount) FILTER (WHERE x.status = 'pending'), 0)::float AS pending_amount,
       COALESCE(SUM(x.amount) FILTER (WHERE x.status = 'rejected'), 0)::float AS rejected_amount,
       COUNT(*)::int AS expense_count
     FROM expenses x
     JOIN employees e ON e.id = x.employee_id
     ${where}
     GROUP BY e.id, e.full_name, e.employee_code
     ORDER BY total_amount DESC
     LIMIT 50`,
    params
  )
  return result.rows
}

export async function getCategoryExpenseSummaries(
  filter: SummaryFilter = {}
): Promise<CategoryExpenseSummary[]> {
  const { where, params } = buildExpenseFilter(filter)
  const needsEmployeeJoin = Boolean(filter.search)
  const result = await pool.query(
    `SELECT
       x.category,
       COALESCE(SUM(x.amount), 0)::float AS total_amount,
       COUNT(*)::int AS expense_count
     FROM expenses x
     ${needsEmployeeJoin ? 'JOIN employees e ON e.id = x.employee_id' : ''}
     ${where}
     GROUP BY x.category
     ORDER BY total_amount DESC`,
    params
  )
  return result.rows
}

export function expensesToCsv(rows: ExpenseRow[]): string {
  const headers = [
    'id',
    'center_id',
    'center_name',
    'employee_id',
    'employee_name',
    'employee_code',
    'category',
    'amount',
    'expense_date',
    'description',
    'payment_method',
    'status',
    'receipt_url',
    'approval_notes',
    'notes',
    'created_at',
  ]

  const escape = (value: unknown) => {
    const str = value == null ? '' : String(value)
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
    return str
  }

  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.center_id,
        row.center_name || '',
        row.employee_id,
        row.employee_name || '',
        row.employee_code || '',
        row.category,
        toAmountNumber(row.amount).toFixed(2),
        String(row.expense_date).slice(0, 10),
        row.description || '',
        row.payment_method,
        row.status,
        row.receipt_url || '',
        row.approval_notes || '',
        row.notes || '',
        row.created_at,
      ]
        .map(escape)
        .join(',')
    )
  }
  return lines.join('\n')
}
