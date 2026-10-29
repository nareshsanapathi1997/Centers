'use client'

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileBarChart2, Printer, Search } from 'lucide-react'
import { authenticatedFetch } from '@/lib/admin-api'
import { superAdminFetch } from '@/lib/super-admin-api'
import { toast } from '@/lib/admin-ui-store'
import { useAdminPermissions, hasAdminGrant } from '@/lib/use-admin-permissions'
import { useSuperAdminPermissions, hasGrant } from '@/lib/use-super-admin-permissions'
import AdminPageShell from '@/components/admin/AdminPageShell'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import AdminButton from '@/components/admin/AdminButton'
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
  LineChart,
  Line,
} from '@/components/charts'
import {
  ADMIN_REPORT_TYPES,
  REPORT_TYPE_LABELS,
  REPORT_TYPES,
  type ReportType,
} from '@/lib/reports-types'
import { expenseCategoryLabel, formatExpenseAmount } from '@/components/admin/expenses/ExpenseFormFields'

type PageInfo = { page: number; pageSize: number; total: number; totalPages: number }
type CenterOption = { id: number; name: string }
type Mode = 'admin' | 'super-admin'

const PAGE_SIZE = 25
const CHART_COLORS = ['#4f46e5', '#6366f1', '#0e7490', '#b45309', '#0f7a4a', '#4338ca', '#4338ca']

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

function formatMoney(value: number | string | null | undefined) {
  return formatExpenseAmount(value ?? 0)
}

function formatCount(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString('en-IN')
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-[var(--cm-color-border)] bg-[var(--cm-color-surface)] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--cm-color-text-muted)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-[var(--cm-color-text)]">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-[var(--cm-color-text-muted)]">{hint}</p> : null}
    </div>
  )
}

type ReportsHubProps =
  | { mode: 'admin'; centerId: string }
  | { mode: 'super-admin'; centerId?: never }

export default function ReportsHubClient(props: ReportsHubProps) {
  const mode: Mode = props.mode
  const adminCenterId = props.mode === 'admin' ? props.centerId : ''

  const { access: adminAccess } = useAdminPermissions(adminCenterId)
  const { access: saAccess } = useSuperAdminPermissions({ enabled: mode === 'super-admin' })

  const canExport =
    mode === 'admin'
      ? hasAdminGrant(adminAccess, 'reports', 'export')
      : hasGrant(saAccess, 'reports', 'export')

  const reportTypes = (mode === 'admin' ? ADMIN_REPORT_TYPES : REPORT_TYPES) as readonly ReportType[]
  const [type, setType] = useState<ReportType>('expenses')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [page, setPage] = useState(1)
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [centerId, setCenterId] = useState('')
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    if (!reportTypes.includes(type)) {
      setType(reportTypes[0])
    }
  }, [reportTypes, type])

  const centersQuery = useQuery({
    queryKey: ['reports', 'centers-options'],
    queryFn: async (): Promise<CenterOption[]> => {
      const res = await superAdminFetch('/api/public/centers')
      const data = await res.json()
      return data.centers || []
    },
    enabled: mode === 'super-admin',
    staleTime: 60_000,
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({
        type,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      })
      if (search.trim()) qs.set('search', search.trim())
      if (dateFrom) qs.set('dateFrom', dateFrom)
      if (dateTo) qs.set('dateTo', dateTo)

      let res: Response
      if (mode === 'admin') {
        qs.set('centerId', adminCenterId)
        res = await authenticatedFetch(`/api/admin/reports?${qs}`, { headers: authHeaders() })
      } else {
        if (centerId) qs.set('centerId', centerId)
        res = await superAdminFetch(`/api/super-admin/reports?${qs}`, { headers: authHeaders() })
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      setPayload(data)
      setPageInfo(data.pagination || null)
    } catch (err) {
      setError(err)
      setPayload(null)
      setPageInfo(null)
    } finally {
      setLoading(false)
    }
  }, [mode, adminCenterId, type, page, search, dateFrom, dateTo, centerId])

  useEffect(() => {
    void load()
  }, [load])

  const handleTypeChange = (next: string) => {
    setType(next as ReportType)
    setPage(1)
    setSearch('')
    setSearchDraft('')
  }

  const handleExport = async () => {
    if (!canExport) {
      toast.error('You need reports.export permission to export')
      return
    }
    const qs = new URLSearchParams({ type, export: 'csv' })
    if (search.trim()) qs.set('search', search.trim())
    if (dateFrom) qs.set('dateFrom', dateFrom)
    if (dateTo) qs.set('dateTo', dateTo)

    let res: Response
    let filename = `report-${type}.csv`
    if (mode === 'admin') {
      qs.set('centerId', adminCenterId)
      filename = `report-${type}-center-${adminCenterId}.csv`
      res = await authenticatedFetch(`/api/admin/reports?${qs}`)
    } else {
      if (centerId) qs.set('centerId', centerId)
      filename = `report-${type}${centerId ? `-center-${centerId}` : '-all-centers'}.csv`
      res = await superAdminFetch(`/api/super-admin/reports?${qs}`)
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Export failed')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded')
  }

  const rows = (payload?.rows as Array<Record<string, unknown>>) || []
  const summary = (payload?.summary as Record<string, unknown>) || null
  const trend = (payload?.trend as Array<{ date: string; count: number; amount?: number }>) || []
  const byCategory =
    (payload?.byCategory as Array<{ category: string; total_amount: number; expense_count: number }>) ||
    []
  const byCourse =
    (payload?.byCourse as Array<{ course_name: string; enquiry_count: number }>) || []
  const byStatus =
    (payload?.byStatus as Array<{ status: string; count: number }>) || []
  const note = typeof payload?.note === 'string' ? payload.note : null

  const showPagination = [
    'enquiries',
    'student_registrations',
    'payments',
    'attendance',
  ].includes(type)
  const columns = useMemo(() => buildColumns(type, mode), [type, mode])
  const summaryCards = useMemo(() => buildSummaryCards(type, summary), [type, summary])

  const total = pageInfo?.total ?? rows.length
  const totalPages = pageInfo?.totalPages ?? 1
  const startIndex = ((pageInfo?.page || page) - 1) * PAGE_SIZE
  const endIndex = startIndex + rows.length

  const content = (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <FileBarChart2 className="h-7 w-7" />
            Reports
          </span>
        }
        description="Operational reports from live expenses, enquiries, students, payments, and attendance."
        breadcrumbs={
          mode === 'admin'
            ? [
                { label: 'Admin', href: `/admin/${adminCenterId}/dashboard` },
                { label: 'Reports' },
              ]
            : [
                { label: 'Super Admin', href: '/super-admin/dashboard' },
                { label: 'Reports' },
              ]
        }
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              icon={<Printer className="h-4 w-4" />}
              onClick={() => window.print()}
            >
              Print
            </AdminButton>
            {canExport ? (
              <AdminButton
                type="button"
                variant="secondary"
                size="sm"
                icon={<Download className="h-4 w-4" />}
                onClick={() => void handleExport()}
              >
                Export CSV
              </AdminButton>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-col gap-3 rounded-lg border border-[var(--cm-color-border)] bg-[var(--cm-color-surface)] p-4 print:border-0 print:p-0">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 print:hidden">
          <Select
            label="Report type"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {reportTypes.map((key) => (
              <option key={key} value={key}>
                {REPORT_TYPE_LABELS[key]}
              </option>
            ))}
          </Select>

          {mode === 'super-admin' ? (
            <Select
              label="Center"
              value={centerId}
              onChange={(e) => {
                setCenterId(e.target.value)
                setPage(1)
              }}
            >
              <option value="">All centers</option>
              {(centersQuery.data || []).map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </Select>
          ) : null}

          <Input
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPage(1)
            }}
          />
          <Input
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setPage(1)
            }}
          />

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-[var(--cm-color-text)]">
              Search
            </label>
            <div className="flex gap-2">
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearch(searchDraft)
                    setPage(1)
                  }
                }}
                placeholder="Search report rows…"
              />
              <AdminButton
                type="button"
                variant="secondary"
                size="sm"
                icon={<Search className="h-4 w-4" />}
                onClick={() => {
                  setSearch(searchDraft)
                  setPage(1)
                }}
              >
                Go
              </AdminButton>
            </div>
          </div>
        </div>

        <p className="text-sm text-[var(--cm-color-text-muted)]">
          Showing{' '}
          <span className="font-medium text-[var(--cm-color-text)]">{REPORT_TYPE_LABELS[type]}</span>
          {dateFrom || dateTo ? ` · ${dateFrom || '…'} to ${dateTo || '…'}` : ' · all dates'}
          {mode === 'super-admin' && centerId
            ? ` · center #${centerId}`
            : mode === 'super-admin'
              ? ' · all centers'
              : ''}
        </p>
      </div>

      {note ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {note}
        </p>
      ) : null}

      {summaryCards.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{summaryCards}</div>
      ) : null}

      {(trend.length > 0 ||
        byCategory.length > 0 ||
        byCourse.length > 0 ||
        byStatus.length > 0 ||
        type === 'course_performance' ||
        type === 'center_performance' ||
        type === 'employee_expenses') && (
        <div className="grid gap-4 lg:grid-cols-2">
          {trend.length > 0 ? (
            <ChartContainer title="Trend" empty={trend.length === 0} height={280}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey={trend.some((t) => t.amount != null) ? 'amount' : 'count'}
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          ) : null}

          {type === 'attendance' && byStatus.length > 0 ? (
            <ChartContainer title="By status" empty={byStatus.length === 0} height={280}>
              <PieChart>
                <Pie
                  data={byStatus.map((row) => ({
                    name: String(row.status).charAt(0).toUpperCase() + String(row.status).slice(1),
                    value: row.count,
                  }))}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label={false}
                >
                  {byStatus.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCount(Number(value ?? 0))} />
              </PieChart>
            </ChartContainer>
          ) : null}

          {type === 'expenses' && byCategory.length > 0 ? (
            <ChartContainer title="By category" empty={byCategory.length === 0} height={280}>
              <PieChart>
                <Pie
                  data={byCategory.map((row) => ({
                    name: expenseCategoryLabel(row.category as never),
                    value: row.total_amount,
                  }))}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label={false}
                >
                  {byCategory.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
              </PieChart>
            </ChartContainer>
          ) : null}

          {type === 'enquiries' && byCourse.length > 0 ? (
            <ChartContainer title="By course interest" empty={byCourse.length === 0} height={280}>
              <BarChart data={byCourse.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="course_name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="enquiry_count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : null}

          {(type === 'employee_expenses' ||
            type === 'course_performance' ||
            type === 'center_performance') &&
          rows.length > 0 ? (
            <ChartContainer
              title={
                type === 'employee_expenses'
                  ? 'Top employees'
                  : type === 'course_performance'
                    ? 'Top courses by revenue'
                    : 'Centers by revenue'
              }
              empty={rows.length === 0}
              height={280}
            >
              <BarChart
                data={rows.slice(0, 8).map((row) => ({
                  name:
                    type === 'employee_expenses'
                      ? String(row.employee_name || '').split(' ')[0]
                      : type === 'course_performance'
                        ? String(row.course_title || '').slice(0, 16)
                        : String(row.center_name || '').slice(0, 16),
                  value: Number(
                    type === 'employee_expenses'
                      ? row.total_amount
                      : type === 'course_performance' || type === 'center_performance'
                        ? row.revenue
                        : 0
                  ),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : null}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--cm-color-text-muted)]">
          {REPORT_TYPE_LABELS[type]} detail
        </h2>
        <AdminDataTable
          columns={columns}
          rows={rows}
          rowKey={(row) =>
            String(
              row.id ??
                row.employee_id ??
                row.course_master_id ??
                row.center_id ??
                row.category ??
                JSON.stringify(row)
            )
          }
          loading={loading}
          error={error}
          onRetry={() => void load()}
          emptyMessage="No data for the selected filters"
        />

        {showPagination && pageInfo ? (
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

      <p className="text-xs text-[var(--cm-color-text-muted)] print:hidden">
        CMS “Results” gallery is website content, not academic exam scores.
      </p>
    </div>
  )

  if (mode === 'admin') {
    return <AdminPageShell>{content}</AdminPageShell>
  }
  return <SuperAdminPageShell>{content}</SuperAdminPageShell>
}

function buildSummaryCards(
  type: ReportType,
  summary: Record<string, unknown> | null
): ReactElement[] {
  if (!summary) return []

  switch (type) {
    case 'expenses':
    case 'employee_expenses':
      return [
        <SummaryCard
          key="total"
          label="Total spend"
          value={formatMoney(summary.total_amount as number)}
          hint={`${formatCount(summary.total_count as number)} expenses`}
        />,
        <SummaryCard
          key="month"
          label="This month"
          value={formatMoney(summary.this_month_amount as number)}
          hint={`${formatCount(summary.this_month_count as number)} expenses`}
        />,
        <SummaryCard
          key="pending"
          label="Pending"
          value={formatMoney(summary.pending_amount as number)}
          hint={`${formatCount(summary.pending_count as number)} expenses`}
        />,
        <SummaryCard
          key="paid"
          label="Paid"
          value={formatMoney(summary.paid_amount as number)}
          hint={`${formatCount(summary.paid_count as number)} expenses`}
        />,
      ]
    case 'enquiries':
      return [
        <SummaryCard
          key="total"
          label="Enquiries"
          value={formatCount(summary.total_count as number)}
        />,
        <SummaryCard key="read" label="Read" value={formatCount(summary.read_count as number)} />,
        <SummaryCard
          key="unread"
          label="Unread"
          value={formatCount(summary.unread_count as number)}
        />,
        <SummaryCard
          key="matched"
          label="Matched students"
          value={formatCount(summary.matched_student_count as number)}
          hint="Email/phone match"
        />,
      ]
    case 'student_registrations':
      return [
        <SummaryCard
          key="total"
          label="Registrations"
          value={formatCount(summary.total_count as number)}
        />,
        <SummaryCard
          key="active"
          label="Active"
          value={formatCount(summary.active_count as number)}
        />,
        <SummaryCard
          key="inactive"
          label="Inactive"
          value={formatCount(summary.inactive_count as number)}
        />,
      ]
    case 'payments':
      return [
        <SummaryCard
          key="rev"
          label="Completed revenue"
          value={formatMoney(summary.completed_revenue as number)}
          hint={`${formatCount(summary.completed_count as number)} payments`}
        />,
        <SummaryCard
          key="pending"
          label="Pending amount"
          value={formatMoney(summary.pending_amount as number)}
          hint={`${formatCount(summary.pending_count as number)} payments`}
        />,
        <SummaryCard
          key="refund"
          label="Refunded"
          value={formatMoney(summary.refunded_amount as number)}
          hint={`${formatCount(summary.refunded_count as number)} payments`}
        />,
        <SummaryCard
          key="total"
          label="All payments"
          value={formatCount(summary.total_count as number)}
        />,
      ]
    case 'course_performance':
      return [
        <SummaryCard
          key="courses"
          label="Courses"
          value={formatCount(summary.course_count as number)}
        />,
        <SummaryCard key="revenue" label="Revenue" value={formatMoney(summary.revenue as number)} />,
        <SummaryCard
          key="completed"
          label="Completed payments"
          value={formatCount(summary.completed_count as number)}
        />,
        <SummaryCard
          key="students"
          label="Unique students (est.)"
          value={formatCount(summary.unique_students as number)}
        />,
      ]
    case 'center_performance':
      return [
        <SummaryCard
          key="centers"
          label="Centers"
          value={formatCount(summary.center_count as number)}
        />,
        <SummaryCard key="revenue" label="Revenue" value={formatMoney(summary.revenue as number)} />,
        <SummaryCard
          key="students"
          label="Students"
          value={formatCount(summary.student_count as number)}
        />,
        <SummaryCard
          key="expenses"
          label="Expenses"
          value={formatMoney(summary.expense_total as number)}
        />,
      ]
    case 'attendance':
      return [
        <SummaryCard
          key="total"
          label="Marked"
          value={formatCount(summary.total_count as number)}
        />,
        <SummaryCard
          key="present"
          label="Present"
          value={formatCount(summary.present_count as number)}
        />,
        <SummaryCard
          key="absent"
          label="Absent"
          value={formatCount(summary.absent_count as number)}
        />,
        <SummaryCard
          key="rate"
          label="Attendance rate"
          value={
            summary.attendance_rate != null
              ? `${formatCount(summary.attendance_rate as number)}%`
              : '—'
          }
          hint={`Late ${formatCount(summary.late_count as number)} · Excused ${formatCount(summary.excused_count as number)}`}
        />,
      ]
    default:
      return []
  }
}

function buildColumns(type: ReportType, mode: Mode): AdminTableColumn<Record<string, unknown>>[] {
  const centerCol: AdminTableColumn<Record<string, unknown>> = {
    key: 'center_name',
    header: 'Center',
    hideOnMobile: true,
    render: (r) => String(r.center_name || '—'),
  }

  switch (type) {
    case 'expenses':
      return [
        {
          key: 'category',
          header: 'Category',
          render: (r) => expenseCategoryLabel(String(r.category) as never),
        },
        {
          key: 'total_amount',
          header: 'Amount',
          render: (r) => formatMoney(r.total_amount as number),
        },
        {
          key: 'expense_count',
          header: 'Count',
          render: (r) => formatCount(r.expense_count as number),
        },
      ]
    case 'employee_expenses':
      return [
        {
          key: 'employee_name',
          header: 'Employee',
          render: (r) => (
            <span>
              {String(r.employee_name || '—')}
              {r.employee_code ? (
                <span className="ml-1 text-xs text-[var(--cm-color-text-muted)]">
                  ({String(r.employee_code)})
                </span>
              ) : null}
            </span>
          ),
        },
        {
          key: 'total_amount',
          header: 'Total',
          render: (r) => formatMoney(r.total_amount as number),
        },
        {
          key: 'approved_amount',
          header: 'Approved',
          hideOnMobile: true,
          render: (r) => formatMoney(r.approved_amount as number),
        },
        {
          key: 'pending_amount',
          header: 'Pending',
          hideOnMobile: true,
          render: (r) => formatMoney(r.pending_amount as number),
        },
        {
          key: 'expense_count',
          header: 'Count',
          render: (r) => formatCount(r.expense_count as number),
        },
      ]
    case 'enquiries':
      return [
        ...(mode === 'super-admin' ? [centerCol] : []),
        {
          key: 'created_at',
          header: 'Date',
          render: (r) => String(r.created_at || '').slice(0, 10),
        },
        {
          key: 'full_name',
          header: 'Name',
          render: (r) => String(r.full_name || '—'),
        },
        {
          key: 'course_name',
          header: 'Course',
          hideOnMobile: true,
          render: (r) => String(r.course_name || '—'),
        },
        {
          key: 'is_read',
          header: 'Status',
          render: (r) => (r.is_read ? 'Read' : 'Unread'),
        },
        {
          key: 'matched_student',
          header: 'Matched',
          hideOnMobile: true,
          render: (r) => (r.matched_student ? 'Yes' : 'No'),
        },
      ]
    case 'student_registrations':
      return [
        ...(mode === 'super-admin' ? [centerCol] : []),
        {
          key: 'created_at',
          header: 'Registered',
          render: (r) => String(r.created_at || '').slice(0, 10),
        },
        {
          key: 'regno',
          header: 'Reg. no',
          render: (r) => String(r.regno || '—'),
        },
        {
          key: 'full_name',
          header: 'Name',
          render: (r) => String(r.full_name || '—'),
        },
        {
          key: 'mobile',
          header: 'Mobile',
          hideOnMobile: true,
          render: (r) => String(r.mobile || '—'),
        },
        {
          key: 'is_active',
          header: 'Active',
          render: (r) => (r.is_active ? 'Yes' : 'No'),
        },
      ]
    case 'payments':
      return [
        ...(mode === 'super-admin' ? [centerCol] : []),
        {
          key: 'created_at',
          header: 'Date',
          render: (r) => String(r.created_at || '').slice(0, 10),
        },
        {
          key: 'receipt_no',
          header: 'Receipt',
          render: (r) => String(r.receipt_no || '—'),
        },
        {
          key: 'student_name',
          header: 'Student',
          render: (r) => String(r.student_name || '—'),
        },
        {
          key: 'course_title',
          header: 'Course',
          hideOnMobile: true,
          render: (r) => String(r.course_title || '—'),
        },
        {
          key: 'amount_paid',
          header: 'Paid',
          render: (r) => formatMoney(r.amount_paid as number),
        },
        {
          key: 'status',
          header: 'Status',
          render: (r) => String(r.status || '—'),
        },
      ]
    case 'course_performance':
      return [
        {
          key: 'course_title',
          header: 'Course',
          render: (r) => String(r.course_title || '—'),
        },
        {
          key: 'revenue',
          header: 'Revenue',
          render: (r) => formatMoney(r.revenue as number),
        },
        {
          key: 'completed_count',
          header: 'Completed',
          render: (r) => formatCount(r.completed_count as number),
        },
        {
          key: 'unique_students',
          header: 'Students',
          render: (r) => formatCount(r.unique_students as number),
        },
        {
          key: 'discount_total',
          header: 'Discounts',
          hideOnMobile: true,
          render: (r) => formatMoney(r.discount_total as number),
        },
      ]
    case 'center_performance':
      return [
        {
          key: 'center_name',
          header: 'Center',
          render: (r) => String(r.center_name || '—'),
        },
        {
          key: 'revenue',
          header: 'Revenue',
          render: (r) => formatMoney(r.revenue as number),
        },
        {
          key: 'student_count',
          header: 'Students',
          render: (r) => formatCount(r.student_count as number),
        },
        {
          key: 'enquiry_count',
          header: 'Enquiries',
          hideOnMobile: true,
          render: (r) => formatCount(r.enquiry_count as number),
        },
        {
          key: 'expense_total',
          header: 'Expenses',
          render: (r) => formatMoney(r.expense_total as number),
        },
        {
          key: 'employee_count',
          header: 'Active staff',
          hideOnMobile: true,
          render: (r) => formatCount(r.employee_count as number),
        },
      ]
    case 'attendance':
      return [
        ...(mode === 'super-admin' ? [centerCol] : []),
        {
          key: 'attendance_date',
          header: 'Date',
          render: (r) => String(r.attendance_date || '').slice(0, 10),
        },
        {
          key: 'batch_name',
          header: 'Class batch',
          render: (r) => String(r.batch_name || '—'),
        },
        {
          key: 'student_name',
          header: 'Student',
          render: (r) => (
            <span>
              {String(r.student_name || '—')}
              {r.student_regno ? (
                <span className="ml-1 text-xs text-[var(--cm-color-text-muted)]">
                  ({String(r.student_regno)})
                </span>
              ) : null}
            </span>
          ),
        },
        {
          key: 'course_title',
          header: 'Course',
          hideOnMobile: true,
          render: (r) => String(r.course_title || '—'),
        },
        {
          key: 'status',
          header: 'Status',
          render: (r) => {
            const status = String(r.status || '')
            return status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'
          },
        },
        {
          key: 'marked_by_name',
          header: 'Marked by',
          hideOnMobile: true,
          render: (r) => String(r.marked_by_name || '—'),
        },
      ]
    default:
      return []
  }
}
