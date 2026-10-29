'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, Plus, Search, Wallet } from 'lucide-react'
import { authenticatedFetch } from '@/lib/admin-api'
import { toast, confirmDialog } from '@/lib/admin-ui-store'
import { useAdminPermissions, hasAdminGrant } from '@/lib/use-admin-permissions'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import AdminButton from '@/components/admin/AdminButton'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import Pagination from '@/components/admin/Pagination'
import PageHeader from '@/components/ui/PageHeader'
import { Input, Select } from '@/components/forms'
import {
  ChartContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from '@/components/charts'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  type CategoryExpenseSummary,
  type EmployeeExpenseSummary,
  type ExpenseRow,
  type ExpenseSummary,
} from '@/lib/expenses-types'
import ExpenseFormFields, {
  EMPTY_EXPENSE_FORM,
  expenseCategoryLabel,
  expenseStatusBadgeClass,
  expenseStatusLabel,
  formatExpenseAmount,
  formToPayload,
  type EmployeeOption,
  type ExpenseFormState,
} from '@/components/admin/expenses/ExpenseFormFields'

type PageInfo = { page: number; pageSize: number; total: number; totalPages: number }

const PAGE_SIZE = 25
const CHART_COLORS = ['#4f46e5', '#6366f1', '#0e7490', '#b45309', '#0f7a4a', '#4338ca', '#4338ca']

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

function SummaryCard({
  label,
  amount,
  count,
}: {
  label: string
  amount: number
  count?: number
}) {
  return (
    <div className="rounded-lg border border-[var(--cm-color-border)] bg-[var(--cm-color-surface)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--cm-color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-[var(--cm-color-text)]">
        {formatExpenseAmount(amount)}
      </p>
      {count != null ? (
        <p className="mt-0.5 text-xs text-[var(--cm-color-text-muted)]">{count} records</p>
      ) : null}
    </div>
  )
}

export default function AdminExpensesPageClient({ centerId }: { centerId: string }) {
  const { access } = useAdminPermissions(centerId)
  const canCreate = hasAdminGrant(access, 'expenses', 'create')
  const canEdit = hasAdminGrant(access, 'expenses', 'update')
  const canDelete = hasAdminGrant(access, 'expenses', 'delete')
  const canApprove = hasAdminGrant(access, 'expenses', 'approve')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [byEmployee, setByEmployee] = useState<EmployeeExpenseSummary[]>([])
  const [byCategory, setByCategory] = useState<CategoryExpenseSummary[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseRow | null>(null)
  const [form, setForm] = useState<ExpenseFormState>({ ...EMPTY_EXPENSE_FORM, centerId })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({
        centerId,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      })
      if (search.trim()) qs.set('search', search.trim())
      if (status) qs.set('status', status)
      if (category) qs.set('category', category)
      if (employeeId) qs.set('employeeId', employeeId)
      if (dateFrom) qs.set('dateFrom', dateFrom)
      if (dateTo) qs.set('dateTo', dateTo)

      const res = await authenticatedFetch(`/api/admin/expenses?${qs}`, {
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      setExpenses(data.expenses || [])
      setPageInfo(data.pagination || null)
      setSummary(data.summary || null)
      setByEmployee(data.byEmployee || [])
      setByCategory(data.byCategory || [])
    } catch (err) {
      setError(err)
      setExpenses([])
      setPageInfo(null)
      setSummary(null)
      setByEmployee([])
      setByCategory([])
    } finally {
      setLoading(false)
    }
  }, [centerId, page, search, status, category, employeeId, dateFrom, dateTo])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    authenticatedFetch(`/api/admin/employees?centerId=${centerId}&pageSize=200`, {
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
  }, [centerId])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_EXPENSE_FORM, centerId })
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (row: ExpenseRow) => {
    setEditing(row)
    setForm({
      ...EMPTY_EXPENSE_FORM,
      centerId,
      employeeId: String(row.employee_id),
      category: row.category,
      amount: String(row.amount),
      expenseDate: String(row.expense_date).slice(0, 10),
      description: row.description || '',
      receiptUrl: row.receipt_url || '',
      receiptName: row.receipt_name || '',
      paymentMethod: row.payment_method,
      status: row.status,
      approvalNotes: row.approval_notes || '',
      notes: row.notes || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = formToPayload({ ...form, centerId })
      const res = await authenticatedFetch(
        editing ? `/api/admin/expenses/${editing.id}` : '/api/admin/expenses',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Failed to save expense')
        return
      }
      toast.success(editing ? 'Expense updated' : 'Expense created')
      setModalOpen(false)
      void load()
    } catch {
      setFormError('Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: ExpenseRow) => {
    const ok = await confirmDialog({
      title: 'Delete expense',
      message: `Delete this ${expenseCategoryLabel(row.category)} expense of ${formatExpenseAmount(row.amount)}?`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return

    const res = await authenticatedFetch(
      `/api/admin/expenses/${row.id}?centerId=${centerId}`,
      { method: 'DELETE', headers: authHeaders() }
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Delete failed')
      return
    }
    toast.success('Expense deleted')
    void load()
  }

  const handleExport = async () => {
    const qs = new URLSearchParams({ centerId, export: 'csv' })
    if (search.trim()) qs.set('search', search.trim())
    if (status) qs.set('status', status)
    if (category) qs.set('category', category)
    if (employeeId) qs.set('employeeId', employeeId)
    if (dateFrom) qs.set('dateFrom', dateFrom)
    if (dateTo) qs.set('dateTo', dateTo)

    const res = await authenticatedFetch(`/api/admin/expenses?${qs}`)
    if (!res.ok) {
      toast.error('Export failed')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-center-${centerId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns: AdminTableColumn<ExpenseRow>[] = [
    {
      key: 'expense_date',
      header: 'Date',
      sortValue: (r) => r.expense_date,
      render: (r) => String(r.expense_date).slice(0, 10),
    },
    {
      key: 'employee_name',
      header: 'Employee',
      sortValue: (r) => r.employee_name,
      render: (r) => r.employee_name || '—',
    },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (r) => expenseCategoryLabel(r.category),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortValue: (r) => Number(r.amount),
      render: (r) => (
        <Link
          href={`/admin/${centerId}/expenses/${r.id}`}
          className="font-medium text-primary hover:underline"
        >
          {formatExpenseAmount(r.amount)}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span className={expenseStatusBadgeClass(r.status)}>{expenseStatusLabel(r.status)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/${centerId}/expenses/${r.id}`}
            className="text-sm text-primary hover:underline"
          >
            View
          </Link>
          {canEdit || canApprove ? (
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => openEdit(r)}
            >
              Edit
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="text-sm text-red-600 hover:underline dark:text-red-400"
              onClick={() => void handleDelete(r)}
            >
              Delete
            </button>
          ) : null}
        </div>
      ),
    },
  ]

  const employeeColumns: AdminTableColumn<EmployeeExpenseSummary>[] = [
    {
      key: 'employee_name',
      header: 'Employee',
      render: (r) => r.employee_name,
    },
    {
      key: 'total_amount',
      header: 'Total',
      render: (r) => formatExpenseAmount(r.total_amount),
    },
    {
      key: 'approved_amount',
      header: 'Approved',
      hideOnMobile: true,
      render: (r) => formatExpenseAmount(r.approved_amount),
    },
    {
      key: 'pending_amount',
      header: 'Pending',
      hideOnMobile: true,
      render: (r) => formatExpenseAmount(r.pending_amount),
    },
    {
      key: 'rejected_amount',
      header: 'Rejected',
      hideOnMobile: true,
      render: (r) => formatExpenseAmount(r.rejected_amount),
    },
  ]

  const pieData = useMemo(
    () =>
      byCategory.map((row) => ({
        name: expenseCategoryLabel(row.category),
        value: row.total_amount,
      })),
    [byCategory]
  )

  const barData = useMemo(
    () =>
      byEmployee.slice(0, 8).map((row) => ({
        name: row.employee_name.split(' ')[0] || row.employee_name,
        total: row.total_amount,
      })),
    [byEmployee]
  )

  const total = pageInfo?.total ?? 0
  const totalPages = pageInfo?.totalPages ?? 1
  const startIndex = ((pageInfo?.page || page) - 1) * PAGE_SIZE
  const endIndex = startIndex + expenses.length

  return (
    <AdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <Wallet className="h-7 w-7" />
              Expenses
            </span>
          }
          description="Track and approve center expenses linked to employees."
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${centerId}/dashboard` },
            { label: 'Expenses' },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <AdminButton variant="secondary" size="sm" icon={<Download />} onClick={() => void handleExport()}>
                Export CSV
              </AdminButton>
              {canCreate ? (
                <AdminButton variant="primary" size="sm" icon={<Plus />} onClick={openCreate}>
                  Add expense
                </AdminButton>
              ) : null}
            </div>
          }
        />

        {summary ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard label="Total expenses" amount={summary.total_amount} count={summary.total_count} />
            <SummaryCard
              label="This month"
              amount={summary.this_month_amount}
              count={summary.this_month_count}
            />
            <SummaryCard label="Pending" amount={summary.pending_amount} count={summary.pending_count} />
            <SummaryCard
              label="Approved"
              amount={summary.approved_amount + summary.paid_amount}
              count={summary.approved_count + summary.paid_count}
            />
            <SummaryCard
              label="Rejected"
              amount={summary.rejected_amount}
              count={summary.rejected_count}
            />
          </div>
        ) : null}

        {(barData.length > 0 || pieData.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartContainer title="Top employees by spend" empty={barData.length === 0} height={260}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatExpenseAmount(Number(value ?? 0))} />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
            <ChartContainer title="Spend by category" empty={pieData.length === 0} height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label={false}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatExpenseAmount(Number(value ?? 0))} />
              </PieChart>
            </ChartContainer>
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cm-color-text-muted)]" />
            <Input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1)
                  setSearch(searchDraft)
                }
              }}
              placeholder="Search description, employee…"
              className="admin-form-control pl-9"
              aria-label="Search expenses"
            />
          </div>
          <Select
            value={status}
            onChange={(e) => {
              setPage(1)
              setStatus(e.target.value)
            }}
            className="max-w-xs admin-form-control"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {EXPENSE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {expenseStatusLabel(s)}
              </option>
            ))}
          </Select>
          <Select
            value={category}
            onChange={(e) => {
              setPage(1)
              setCategory(e.target.value)
            }}
            className="max-w-xs admin-form-control"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {expenseCategoryLabel(c)}
              </option>
            ))}
          </Select>
          <Select
            value={employeeId}
            onChange={(e) => {
              setPage(1)
              setEmployeeId(e.target.value)
            }}
            className="max-w-xs admin-form-control"
            aria-label="Filter by employee"
          >
            <option value="">All employees</option>
            {employeeOptions.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name}
              </option>
            ))}
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setPage(1)
              setDateFrom(e.target.value)
            }}
            className="max-w-[11rem] admin-form-control"
            aria-label="From date"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setPage(1)
              setDateTo(e.target.value)
            }}
            className="max-w-[11rem] admin-form-control"
            aria-label="To date"
          />
          <AdminButton
            variant="secondary"
            size="sm"
            onClick={() => {
              setPage(1)
              setSearch(searchDraft)
            }}
          >
            Search
          </AdminButton>
        </div>

        <div className="admin-card overflow-hidden">
          <AdminDataTable
            columns={columns}
            rows={expenses}
            rowKey={(r) => r.id}
            loading={loading}
            error={error}
            onRetry={() => void load()}
            caption="Center expenses"
            emptyMessage="No expenses yet. Add the first expense to get started."
            emptyIcon={<Wallet className="h-12 w-12" />}
          />
          {pageInfo ? (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={PAGE_SIZE}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setPage}
            />
          ) : null}
        </div>

        {byEmployee.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--cm-color-text)]">
              Employee-wise summary
            </h2>
            <div className="admin-card overflow-hidden">
              <AdminDataTable
                columns={employeeColumns}
                rows={byEmployee}
                rowKey={(r) => r.employee_id}
                caption="Employee expense totals"
                emptyMessage="No employee totals"
              />
            </div>
          </div>
        ) : null}
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit expense' : 'Add expense'}
        description="Link an expense to an employee with category, amount, and optional receipt."
        size="xlarge"
        formError={formError}
        footer={
          <FormModalActions
            formId="admin-expense-form"
            onCancel={() => setModalOpen(false)}
            submitLabel={editing ? 'Save changes' : 'Create expense'}
            isSubmitting={saving}
          />
        }
      >
        <form id="admin-expense-form" onSubmit={handleSave}>
          <ExpenseFormFields
            form={form}
            onChange={setForm}
            employeeOptions={employeeOptions}
            canApprove={canApprove}
            formId="admin-expense-fields"
          />
        </form>
      </FormModal>
    </AdminPageShell>
  )
}
