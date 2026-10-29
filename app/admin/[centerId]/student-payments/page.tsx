'use client'
import { authenticatedFetch } from '@/lib/admin-api'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { withBasePath } from '@/lib/with-base-path'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import AdminButton from '@/components/admin/AdminButton'
import AdminFormField from '@/components/admin/AdminFormField'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import PageHeader from '@/components/ui/PageHeader'
import { Input, Select } from '@/components/forms'
import type { CenterCoursePricingRow } from '@/lib/course-fees-db'
import type { CourseBatchFeeRow, FeeStructureInput, StudentFeePayment } from '@/lib/course-fees-types'
import { computePayableAmount, installmentPayAmount } from '@/lib/course-fees-utils'
import { CreditCard, Download, ExternalLink, GraduationCap, Plus, Receipt } from 'lucide-react'
import Link from 'next/link'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

const EMPTY_FORM = {
  course_master_id: '',
  batch_id: '',
  student_name: '',
  student_email: '',
  student_mobile: '',
  amount_paid: '',
  payment_method: 'cash',
  payment_type: 'lumpsum' as 'lumpsum' | 'installment',
  installment_no: '1',
  coupon_code: '',
  transaction_id: ''
}

export default function StudentPaymentsPage({ params }: { params: { centerId: string } }) {
  const centerId = params.centerId
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<StudentFeePayment[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [courses, setCourses] = useState<CenterCoursePricingRow[]>([])
  const [courseBatches, setCourseBatches] = useState<CourseBatchFeeRow[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [feePreview, setFeePreview] = useState<FeeStructureInput | null>(null)
  const [quotePreview, setQuotePreview] = useState<{ amount_due: number; coupon_discount: number; gst_amount: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [centerSlug, setCenterSlug] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ centerId })
      if (search.trim()) qs.set('search', search.trim())
      if (statusFilter) qs.set('status', statusFilter)
      const [payRes, coursesRes] = await Promise.all([
        authenticatedFetch(`/api/admin/student-payments?${qs}`, { headers: authHeaders() }),
        authenticatedFetch(`/api/admin/course-fees?centerId=${centerId}`, { headers: authHeaders() }),
      ])
      if (payRes.ok) setPayments(await payRes.json())
      if (coursesRes.ok) {
        const data = await coursesRes.json()
        const rows = Array.isArray(data.courses) ? data.courses : []
        setCourses(
          rows.filter(
            (r: CenterCoursePricingRow) =>
              r.pricing_status === 'saved' ||
              r.pricing_status === 'approved' ||
              r.pricing_status === 'partial' ||
              (r.batch_count && r.batch_count > 0 && (r.batches_priced_count || 0) > 0)
          )
        )
      }
    } finally {
      setLoading(false)
    }
  }, [centerId, search, statusFilter])

  useEffect(() => {
    load()
    authenticatedFetch(`/api/admin/center/${centerId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setCenterSlug(data.slug || ''))
      .catch(() => {})
  }, [load, centerId])

  useEffect(() => {
    if (!form.course_master_id) {
      setFeePreview(null)
      setCourseBatches([])
      return
    }
    authenticatedFetch(`/api/admin/course-fees/${form.course_master_id}?centerId=${centerId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setFeePreview(data.resolved || null))
      .catch(() => setFeePreview(null))

    authenticatedFetch(`/api/admin/course-fees/batches?centerId=${centerId}&courseMasterId=${form.course_master_id}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setCourseBatches(data.batches || []))
      .catch(() => setCourseBatches([]))
  }, [form.course_master_id, centerId])

  useEffect(() => {
    if (!feePreview || !form.course_master_id) {
      setQuotePreview(null)
      return
    }
    void (async () => {
      try {
        const res = await authenticatedFetch('/api/admin/student-payments/quote', { method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            center_id: Number(centerId),
            course_master_id: Number(form.course_master_id),
            batch_id: form.batch_id ? Number(form.batch_id) : null,
            payment_type: form.payment_type,
            installment_no: form.payment_type === 'installment' ? Number(form.installment_no) : null,
            coupon_code: form.coupon_code || null })
        })
        const data = await res.json()
        if (res.ok) setQuotePreview(data)
        else setQuotePreview(null)
      } catch {
        setQuotePreview(null)
      }
    })()
  }, [feePreview, form.payment_type, form.installment_no, form.coupon_code, form.course_master_id, form.batch_id, centerId])

  const openReceipt = async (paymentId: number) => {
    const res = await authenticatedFetch(`/api/admin/student-payments/${paymentId}/receipt?centerId=${centerId}`, { headers: authHeaders() })
    if (!res.ok) {
      toast.error('Could not load receipt')
      return
    }
    const html = await res.text()
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  const exportCsv = async () => {
    const qs = new URLSearchParams({ centerId, export: 'csv' })
    if (search.trim()) qs.set('search', search.trim())
    if (statusFilter) qs.set('status', statusFilter)
    const res = await authenticatedFetch(`/api/admin/student-payments?${qs}`, { headers: authHeaders() })
    if (!res.ok) {
      toast.error('Export failed')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payments-center-${centerId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feePreview || !form.course_master_id) return
    setSaving(true)
    setFormError('')
    try {
      const amount = Number(form.amount_paid) || quotePreview?.amount_due || computePayableAmount(feePreview)
      const res = await authenticatedFetch('/api/admin/student-payments', { method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          center_id: Number(centerId),
          course_master_id: Number(form.course_master_id),
          batch_id: form.batch_id ? Number(form.batch_id) : null,
          student_name: form.student_name,
          student_email: form.student_email || null,
          student_mobile: form.student_mobile,
          payment_type: form.payment_type,
          installment_no: form.payment_type === 'installment' ? Number(form.installment_no) : null,
          amount_paid: amount,
          payment_method: form.payment_method,
          coupon_code: form.coupon_code || null,
          transaction_id: form.transaction_id || null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to record payment')
      setShowForm(false)
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const summary = useMemo(
    () => ({
      completed: payments.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount_paid, 0),
      pending: payments.filter((p) => p.status === 'pending').length,
      refunded: payments.filter((p) => p.status === 'refunded').length
    }),
    [payments]
  )

  const columns: AdminTableColumn<StudentFeePayment>[] = [
    {
      key: 'receipt',
      header: 'Receipt',
      sortValue: (p) => p.receipt_no,
      render: (p) => (
        <span className="inline-flex items-center gap-1 font-mono text-xs">
          <Receipt className="w-3.5 h-3.5" />
          {p.receipt_no}
        </span>
      ),
    },
    {
      key: 'student',
      header: 'Student',
      sortValue: (p) => p.student_name,
      render: (p) => (
        <div>
          <div className="font-medium text-[var(--cm-color-text)]">{p.student_name}</div>
          <div className="text-xs text-[var(--cm-color-text-muted)]">{p.student_mobile}</div>
          {centerSlug && p.student_mobile ? (
            <div className="mt-1 flex flex-wrap gap-2">
              <Link
                href={`/admin/${centerId}/students?search=${encodeURIComponent(p.student_mobile)}`}
                className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
              >
                <GraduationCap className="w-3 h-3" />
                Portal account
              </Link>
              <a
                href={`/${centerSlug}/student/login`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Open portal
              </a>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      hideOnMobile: true,
      sortValue: (p) => p.course_title,
      render: (p) => p.course_title,
    },
    {
      key: 'paid',
      header: 'Paid',
      align: 'right',
      sortValue: (p) => p.amount_paid,
      render: (p) => (
        <span className="font-medium">₹{p.amount_paid.toLocaleString('en-IN')}</span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      hideOnMobile: true,
      sortValue: (p) => p.payment_method,
      render: (p) => <span className="capitalize">{p.payment_method || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (p) => p.status,
      render: (p) => (
        <span
          className={`text-xs font-medium ${
            p.status === 'completed'
              ? 'text-green-600'
              : p.status === 'refunded'
                ? 'text-red-600'
                : 'text-amber-600'
          }`}
        >
          {p.status}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      hideOnMobile: true,
      sortValue: (p) => (p.created_at ? new Date(p.created_at) : null),
      render: (p) => (p.created_at ? new Date(p.created_at).toLocaleString('en-IN') : '—'),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) =>
        p.status === 'completed' ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void openReceipt(p.id)}
              className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Receipt
            </button>
            <button
              type="button"
              className="text-xs text-red-600 hover:underline"
              onClick={async () => {
                if (!(await confirmDialog({ message: 'Refund this payment?', destructive: true }))) return
                const res = await authenticatedFetch(`/api/admin/student-payments/${p.id}/refund`, {
                  method: 'POST',
                  headers: authHeaders(),
                  body: JSON.stringify({ center_id: Number(centerId), notes: 'Admin refund' }),
                })
                if (!res.ok) {
                  const data = await res.json()
                  toast.error(data.error || 'Refund failed')
                  return
                }
                await load()
              }}
            >
              Refund
            </button>
          </div>
        ) : (
          <span className="text-[var(--cm-color-text-muted)]">—</span>
        ),
    },
  ]

  return (
    <AdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <CreditCard className="h-7 w-7" />
              Student Payments
            </span>
          }
          description="Collect payments, generate receipts, and view payment history."
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${centerId}` },
            { label: 'Student Payments' },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <AdminButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const res = await authenticatedFetch('/api/admin/student-payments/link-accounts', {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({ centerId: parseInt(centerId, 10), linkAllUnlinked: true }),
                  })
                  const data = await res.json()
                  toast.error(data.message || (res.ok ? 'Done' : data.error))
                  if (res.ok) load()
                }}
              >
                <GraduationCap className="w-4 h-4" />
                Link to Portal Accounts
              </AdminButton>
              <AdminButton type="button" variant="secondary" size="sm" onClick={() => void exportCsv()}>
                <Download className="w-4 h-4" />
                Export CSV
              </AdminButton>
              <AdminButton type="button" variant="primary" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4" />
                Record Payment
              </AdminButton>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="admin-card p-4">
            <p className="text-sm text-[var(--cm-color-text-muted)]">Completed revenue</p>
            <p className="text-xl font-bold">₹{summary.completed.toLocaleString('en-IN')}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-sm text-[var(--cm-color-text-muted)]">Pending orders</p>
            <p className="text-xl font-bold">{summary.pending}</p>
          </div>
          <div className="admin-card p-4">
            <p className="text-sm text-[var(--cm-color-text-muted)]">Refunded</p>
            <p className="text-xl font-bold">{summary.refunded}</p>
          </div>
        </div>

        <div className="admin-card space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-[200px] max-w-md flex-1">
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, mobile, or receipt..."
                aria-label="Search payments"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </Select>
          </div>

          <AdminDataTable
            columns={columns}
            rows={payments}
            rowKey={(p) => p.id}
            loading={loading && payments.length === 0}
            emptyMessage="No payments yet."
            caption="Student payments"
          />
        </div>
      </div>

      <FormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setFormError('')
        }}
        title="Record Student Payment"
        formError={formError || undefined}
        footer={
          <FormModalActions
            onCancel={() => {
              setShowForm(false)
              setFormError('')
            }}
            submitLabel="Generate Receipt"
            isSubmitting={saving}
            submitDisabled={!feePreview}
            formId="record-payment-form"
          />
        }
      >
        <form id="record-payment-form" onSubmit={recordPayment} className="admin-form space-y-4">
          <AdminFormField label="Course">
            <select
              required
              value={form.course_master_id}
              onChange={(e) => setForm({ ...form, course_master_id: e.target.value, batch_id: '' })}
              className="admin-form-control"
            >
              <option value="">Select course (fee must be saved)</option>
              {courses.map((c) => (
                <option key={c.course_master_id} value={c.course_master_id}>
                  {c.course_title}
                </option>
              ))}
            </select>
          </AdminFormField>
          {courseBatches.length > 0 ? (
            <AdminFormField label="Batch" hint="Required if course has batches">
              <select
                value={form.batch_id}
                onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                className="admin-form-control"
              >
                <option value="">Course default</option>
                {courseBatches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.batch_name || `Batch #${b.id}`}
                  </option>
                ))}
              </select>
            </AdminFormField>
          ) : null}
          {quotePreview ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 admin-form-section-note">
              Amount due (incl. GST/coupon): <strong>₹{quotePreview.amount_due.toLocaleString('en-IN')}</strong>
            </p>
          ) : null}
          <AdminFormField label="Student Name">
            <input
              required
              value={form.student_name}
              onChange={(e) => setForm({ ...form, student_name: e.target.value })}
              className="admin-form-control"
            />
          </AdminFormField>
          <div className="admin-form-row admin-form-row--2">
            <AdminFormField label="Mobile">
              <input
                required
                value={form.student_mobile}
                onChange={(e) => setForm({ ...form, student_mobile: e.target.value })}
                className="admin-form-control"
              />
            </AdminFormField>
            <AdminFormField label="Email">
              <input
                type="email"
                value={form.student_email}
                onChange={(e) => setForm({ ...form, student_email: e.target.value })}
                className="admin-form-control"
              />
            </AdminFormField>
          </div>
          <div className="admin-form-row admin-form-row--2">
            <AdminFormField label="Payment Type">
              <select
                value={form.payment_type}
                onChange={(e) => setForm({ ...form, payment_type: e.target.value as 'lumpsum' | 'installment' })}
                className="admin-form-control"
              >
                <option value="lumpsum">Lump Sum</option>
                <option value="installment">Installment</option>
              </select>
            </AdminFormField>
            {form.payment_type === 'installment' && feePreview ? (
              <AdminFormField label="Installment #">
                <select
                  value={form.installment_no}
                  onChange={(e) => setForm({ ...form, installment_no: e.target.value })}
                  className="admin-form-control"
                >
                  {[1, 2, 3].slice(0, Math.min(feePreview.num_installments || 1, 3)).map((n) => (
                    <option key={n} value={String(n)}>
                      #{n} — ₹{installmentPayAmount(feePreview, n).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </AdminFormField>
            ) : (
              <AdminFormField label="Amount Paid (₹)">
                <input
                  type="number"
                  min={0}
                  value={form.amount_paid}
                  onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                  placeholder={quotePreview ? String(quotePreview.amount_due) : ''}
                  className="admin-form-control"
                />
              </AdminFormField>
            )}
          </div>
          <AdminFormField label="Coupon code" hint="Optional">
            <input
              value={form.coupon_code}
              onChange={(e) => setForm({ ...form, coupon_code: e.target.value })}
              className="admin-form-control"
            />
          </AdminFormField>
          <div className="admin-form-row admin-form-row--2">
            <AdminFormField label="Payment Method">
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                className="admin-form-control"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </AdminFormField>
            <AdminFormField label="Transaction / UPI ref" hint="Optional">
              <input
                value={form.transaction_id}
                onChange={(e) => setForm({ ...form, transaction_id: e.target.value })}
                className="admin-form-control"
              />
            </AdminFormField>
          </div>
        </form>
      </FormModal>
    </AdminPageShell>
  )
}
