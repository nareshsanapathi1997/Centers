'use client'

import { useState } from 'react'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_STATUSES,
  toAmountNumber,
  type ExpenseCategory,
  type ExpensePaymentMethod,
  type ExpenseRow,
  type ExpenseStatus,
} from '@/lib/expenses-types'
import AdminFormField from '@/components/admin/AdminFormField'
import { Input, Select, Textarea } from '@/components/forms'
import FileUploadField from '@/components/forms/FileUploadField'
import { authenticatedFetch } from '@/lib/admin-api'
import { superAdminFetch } from '@/lib/super-admin-api'
import { toast } from '@/lib/admin-ui-store'

export type ExpenseFormState = {
  centerId: string
  employeeId: string
  category: ExpenseCategory
  amount: string
  expenseDate: string
  description: string
  receiptUrl: string
  receiptName: string
  paymentMethod: ExpensePaymentMethod
  status: ExpenseStatus
  approvalNotes: string
  notes: string
}

export const EMPTY_EXPENSE_FORM: ExpenseFormState = {
  centerId: '',
  employeeId: '',
  category: 'miscellaneous',
  amount: '',
  expenseDate: new Date().toISOString().slice(0, 10),
  description: '',
  receiptUrl: '',
  receiptName: '',
  paymentMethod: 'cash',
  status: 'draft',
  approvalNotes: '',
  notes: '',
}

const STATUS_LABELS: Record<ExpenseStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  travel: 'Travel',
  food: 'Food & Meals',
  office_supplies: 'Office supplies',
  utilities: 'Utilities',
  rent: 'Rent',
  salary: 'Salary',
  marketing: 'Marketing',
  maintenance: 'Maintenance',
  training: 'Training',
  transport: 'Transport',
  communication: 'Communication',
  miscellaneous: 'Miscellaneous',
}

const PAYMENT_LABELS: Record<ExpensePaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank transfer',
  cheque: 'Cheque',
  card: 'Card',
  other: 'Other',
}

export function expenseStatusLabel(status: string) {
  return STATUS_LABELS[status as ExpenseStatus] || status
}

export function expenseCategoryLabel(category: string) {
  return CATEGORY_LABELS[category as ExpenseCategory] || category
}

export function expensePaymentLabel(method: string) {
  return PAYMENT_LABELS[method as ExpensePaymentMethod] || method
}

export function expenseStatusBadgeClass(status: string) {
  switch (status) {
    case 'approved':
    case 'paid':
      return 'admin-badge admin-badge-success'
    case 'pending':
      return 'admin-badge admin-badge-warning'
    case 'rejected':
      return 'admin-badge admin-badge-danger'
    default:
      return 'admin-badge'
  }
}

export function formatExpenseAmount(value: string | number | null | undefined) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(toAmountNumber(value))
}

export function expenseToForm(row: ExpenseRow, centerId?: string): ExpenseFormState {
  return {
    centerId: centerId || String(row.center_id),
    employeeId: String(row.employee_id),
    category: row.category,
    amount: String(toAmountNumber(row.amount)),
    expenseDate: String(row.expense_date).slice(0, 10),
    description: row.description || '',
    receiptUrl: row.receipt_url || '',
    receiptName: row.receipt_name || '',
    paymentMethod: row.payment_method,
    status: row.status,
    approvalNotes: row.approval_notes || '',
    notes: row.notes || '',
  }
}

export function formToPayload(form: ExpenseFormState) {
  return {
    centerId: Number(form.centerId),
    employeeId: Number(form.employeeId),
    category: form.category,
    amount: Number(form.amount),
    expenseDate: form.expenseDate,
    description: form.description || null,
    receiptUrl: form.receiptUrl || null,
    receiptName: form.receiptName || null,
    paymentMethod: form.paymentMethod,
    status: form.status,
    approvalNotes: form.approvalNotes || null,
    notes: form.notes || null,
  }
}

export type EmployeeOption = {
  id: number
  full_name: string
  employee_code?: string | null
}

type ExpenseFormFieldsProps = {
  form: ExpenseFormState
  onChange: (next: ExpenseFormState) => void
  employeeOptions: EmployeeOption[]
  canApprove?: boolean
  showCenterSelect?: boolean
  centerOptions?: Array<{ id: number; name: string }>
  /** Use super-admin API for receipt upload when true. */
  superAdmin?: boolean
  formId?: string
}

export default function ExpenseFormFields({
  form,
  onChange,
  employeeOptions,
  canApprove = false,
  showCenterSelect = false,
  centerOptions = [],
  superAdmin = false,
  formId = 'expense-form-fields',
}: ExpenseFormFieldsProps) {
  const [uploading, setUploading] = useState(false)

  const set = <K extends keyof ExpenseFormState>(key: K, value: ExpenseFormState[K]) => {
    onChange({ ...form, [key]: value })
  }

  const handleReceipt = async (file: File) => {
    if (!form.centerId) {
      toast.error('Select a center before uploading a receipt')
      return
    }
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('centerId', form.centerId)
      const fetchFn = superAdmin ? superAdminFetch : authenticatedFetch
      const endpoint = superAdmin
        ? '/api/super-admin/expenses/upload'
        : '/api/admin/expenses/upload'
      const res = await fetchFn(endpoint, { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Receipt upload failed')
        return
      }
      onChange({
        ...form,
        receiptUrl: data.url || '',
        receiptName: data.originalName || data.fileName || file.name,
      })
      toast.success('Receipt uploaded')
    } catch {
      toast.error('Receipt upload failed')
    } finally {
      setUploading(false)
    }
  }

  const statusOptions = canApprove
    ? EXPENSE_STATUSES
    : EXPENSE_STATUSES.filter((s) => s === 'draft' || s === 'pending' || s === form.status)

  return (
    <div id={formId} className="grid gap-4 sm:grid-cols-2">
      {showCenterSelect ? (
        <AdminFormField label="Center" required className="sm:col-span-2">
          <Select
            value={form.centerId}
            onChange={(e) =>
              onChange({ ...form, centerId: e.target.value, employeeId: '' })
            }
            className="admin-form-control"
            required
          >
            <option value="">Select center</option>
            {centerOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </AdminFormField>
      ) : null}

      <AdminFormField label="Employee" required className="sm:col-span-2">
        <Select
          value={form.employeeId}
          onChange={(e) => set('employeeId', e.target.value)}
          className="admin-form-control"
          required
        >
          <option value="">Select employee</option>
          {employeeOptions.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.full_name}
              {emp.employee_code ? ` (${emp.employee_code})` : ''}
            </option>
          ))}
        </Select>
      </AdminFormField>

      <AdminFormField label="Category" required>
        <Select
          value={form.category}
          onChange={(e) => set('category', e.target.value as ExpenseCategory)}
          className="admin-form-control"
          required
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {expenseCategoryLabel(c)}
            </option>
          ))}
        </Select>
      </AdminFormField>

      <AdminFormField label="Amount (₹)" required>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          value={form.amount}
          onChange={(e) => set('amount', e.target.value)}
          className="admin-form-control"
          required
        />
      </AdminFormField>

      <AdminFormField label="Date" required>
        <Input
          type="date"
          value={form.expenseDate}
          onChange={(e) => set('expenseDate', e.target.value)}
          className="admin-form-control"
          required
        />
      </AdminFormField>

      <AdminFormField label="Payment method" required>
        <Select
          value={form.paymentMethod}
          onChange={(e) => set('paymentMethod', e.target.value as ExpensePaymentMethod)}
          className="admin-form-control"
          required
        >
          {EXPENSE_PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {expensePaymentLabel(m)}
            </option>
          ))}
        </Select>
      </AdminFormField>

      <AdminFormField label="Status" required>
        <Select
          value={form.status}
          onChange={(e) => set('status', e.target.value as ExpenseStatus)}
          className="admin-form-control"
          required
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {expenseStatusLabel(s)}
            </option>
          ))}
        </Select>
      </AdminFormField>

      <AdminFormField label="Description" className="sm:col-span-2">
        <Textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="admin-form-control"
          rows={3}
          placeholder="What was this expense for?"
        />
      </AdminFormField>

      <div className="sm:col-span-2">
        <FileUploadField
          label="Receipt"
          value={form.receiptUrl}
          fileName={form.receiptName}
          onFile={handleReceipt}
          onClear={() => onChange({ ...form, receiptUrl: '', receiptName: '' })}
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf"
          formatHint="JPG, PNG, WebP, or PDF"
          uploading={uploading}
          previewLabel="View receipt"
        />
      </div>

      {canApprove ? (
        <AdminFormField label="Approval notes" className="sm:col-span-2">
          <Textarea
            value={form.approvalNotes}
            onChange={(e) => set('approvalNotes', e.target.value)}
            className="admin-form-control"
            rows={2}
            placeholder="Notes for approve / reject / paid decisions"
          />
        </AdminFormField>
      ) : null}

      <AdminFormField label="Internal notes" className="sm:col-span-2">
        <Textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          className="admin-form-control"
          rows={2}
        />
      </AdminFormField>
    </div>
  )
}
