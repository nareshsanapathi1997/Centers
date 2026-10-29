'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2, Wallet } from 'lucide-react'
import { superAdminFetch } from '@/lib/super-admin-api'
import { toast, confirmDialog } from '@/lib/admin-ui-store'
import { useSuperAdminPermissions, hasGrant } from '@/lib/use-super-admin-permissions'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import AdminButton from '@/components/admin/AdminButton'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import AdminErrorState from '@/components/admin/AdminErrorState'
import type { ExpenseRow } from '@/lib/expenses-types'
import ExpenseFormFields, {
  EMPTY_EXPENSE_FORM,
  expenseCategoryLabel,
  expensePaymentLabel,
  expenseStatusBadgeClass,
  expenseStatusLabel,
  expenseToForm,
  formatExpenseAmount,
  formToPayload,
  type EmployeeOption,
  type ExpenseFormState,
} from '@/components/admin/expenses/ExpenseFormFields'

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--cm-color-text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-[var(--cm-color-text)]">{value || '—'}</dd>
    </div>
  )
}

export default function SuperAdminExpenseDetailClient({ expenseId }: { expenseId: string }) {
  const { access } = useSuperAdminPermissions()
  const canEdit = hasGrant(access, 'expenses', 'update')
  const canDelete = hasGrant(access, 'expenses', 'delete')
  const canApprove = hasGrant(access, 'expenses', 'approve')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [expense, setExpense] = useState<ExpenseRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ExpenseFormState>({ ...EMPTY_EXPENSE_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])
  const [centers, setCenters] = useState<Array<{ id: number; name: string }>>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await superAdminFetch(`/api/super-admin/expenses/${expenseId}`, {
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      setExpense(data.expense)
    } catch (err) {
      setError(err)
      setExpense(null)
    } finally {
      setLoading(false)
    }
  }, [expenseId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    superAdminFetch('/api/public/centers')
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        setCenters(data.centers || [])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!expense?.center_id) return
    superAdminFetch(`/api/super-admin/employees?centerId=${expense.center_id}&pageSize=200`, {
      headers: authHeaders(),
    })
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        setEmployeeOptions(
          (data.employees || []).map(
            (row: { id: number; full_name: string; employee_code?: string | null }) => ({
              id: row.id,
              full_name: row.full_name,
              employee_code: row.employee_code,
            })
          )
        )
      })
      .catch(() => {})
  }, [expense?.center_id])

  const openEdit = () => {
    if (!expense) return
    setForm(expenseToForm(expense))
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expense) return
    setSaving(true)
    setFormError('')
    try {
      const payload = formToPayload(form)
      const res = await superAdminFetch(`/api/super-admin/expenses/${expense.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Failed to update expense')
        return
      }
      toast.success('Expense updated')
      setModalOpen(false)
      void load()
    } catch {
      setFormError('Failed to update expense')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!expense) return
    const ok = await confirmDialog({
      title: 'Delete expense',
      message: `Delete this ${expenseCategoryLabel(expense.category)} expense? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return

    const res = await superAdminFetch(`/api/super-admin/expenses/${expense.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Delete failed')
      return
    }
    toast.success('Expense deleted')
    window.location.href = '/super-admin/expenses'
  }

  if (loading) {
    return (
      <SuperAdminPageShell>
        <LoadingSkeleton />
      </SuperAdminPageShell>
    )
  }

  if (error || !expense) {
    return (
      <SuperAdminPageShell>
        <AdminErrorState
          error={error || new Error('Expense not found')}
          onRetry={() => void load()}
        />
      </SuperAdminPageShell>
    )
  }

  return (
    <SuperAdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <Wallet className="h-7 w-7" />
              {formatExpenseAmount(expense.amount)}
            </span>
          }
          description={`${expense.center_name || 'Center'} · ${expenseCategoryLabel(expense.category)}`}
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin/dashboard' },
            { label: 'Expenses', href: '/super-admin/expenses' },
            { label: `#${expense.id}` },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/super-admin/expenses">
                <AdminButton variant="secondary" size="sm" icon={<ArrowLeft />}>
                  Back
                </AdminButton>
              </Link>
              {canEdit || canApprove ? (
                <AdminButton variant="primary" size="sm" icon={<Pencil />} onClick={openEdit}>
                  Edit
                </AdminButton>
              ) : null}
              {canDelete ? (
                <AdminButton
                  variant="danger"
                  size="sm"
                  icon={<Trash2 />}
                  onClick={() => void handleDelete()}
                >
                  Delete
                </AdminButton>
              ) : null}
            </div>
          }
        />

        <div className="admin-card space-y-6 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className={expenseStatusBadgeClass(expense.status)}>
              {expenseStatusLabel(expense.status)}
            </span>
            <span className="text-sm text-[var(--cm-color-text-muted)]">
              {String(expense.expense_date).slice(0, 10)}
            </span>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Amount" value={formatExpenseAmount(expense.amount)} />
            <DetailItem label="Category" value={expenseCategoryLabel(expense.category)} />
            <DetailItem label="Payment method" value={expensePaymentLabel(expense.payment_method)} />
            <DetailItem label="Center" value={expense.center_name} />
            <DetailItem
              label="Employee"
              value={
                expense.employee_id ? (
                  <Link
                    href={`/super-admin/employees/${expense.employee_id}`}
                    className="text-primary hover:underline"
                  >
                    {expense.employee_name}
                    {expense.employee_code ? ` (${expense.employee_code})` : ''}
                  </Link>
                ) : (
                  expense.employee_name
                )
              }
            />
            <DetailItem label="Date" value={String(expense.expense_date).slice(0, 10)} />
            <DetailItem
              label="Receipt"
              value={
                expense.receipt_url ? (
                  <a
                    href={expense.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {expense.receipt_name || 'View receipt'}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <DetailItem label="Description" value={expense.description} />
            <DetailItem label="Approval notes" value={expense.approval_notes} />
            <DetailItem label="Notes" value={expense.notes} />
          </dl>
        </div>
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit expense"
        size="xlarge"
        formError={formError}
        footer={
          <FormModalActions
            formId="sa-expense-detail-form"
            onCancel={() => setModalOpen(false)}
            submitLabel="Save changes"
            isSubmitting={saving}
          />
        }
      >
        <form id="sa-expense-detail-form" onSubmit={handleSave}>
          <ExpenseFormFields
            form={form}
            onChange={setForm}
            employeeOptions={employeeOptions}
            canApprove={canApprove}
            showCenterSelect
            centerOptions={centers}
            superAdmin
          />
        </form>
      </FormModal>
    </SuperAdminPageShell>
  )
}
