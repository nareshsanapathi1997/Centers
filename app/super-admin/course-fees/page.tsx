'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { withBasePath } from '@/lib/with-base-path'
import AdminPageSpinner from '@/components/admin/AdminPageSpinner'
import AdminButton from '@/components/admin/AdminButton'
import AdminFormField from '@/components/admin/AdminFormField'
import FormModal from '@/components/admin/FormModal'
import CourseFeeCatalogFilters from '@/components/admin/course-fees/CourseFeeCatalogFilters'
import CourseFeeCourseCascade from '@/components/admin/course-fees/CourseFeeCourseCascade'
import CourseFeeStructureForm from '@/components/admin/course-fees/CourseFeeStructureForm'
import FeeAlert from '@/components/admin/course-fees/FeeAlert'
import FeeStatusBadge from '@/components/admin/course-fees/FeeStatusBadge'
import {
  EMPTY_FEE_FORM,
  type CourseBatchFeeRow,
  type CourseFeeDiscount,
  type FeeStructureInput,
  type StudentFeePayment
} from '@/lib/course-fees-types'
import { feeInputFromRow, formatInr, validateFeeForm, buildPaymentLink } from '@/lib/course-fees-utils'
import {
  BookOpen,
  CheckCircle,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  IndianRupee,
  Pencil,
  Percent,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { confirmDialog } from '@/lib/admin-ui-store'

type Tab = 'base-fees' | 'discounts' | 'approvals' | 'payments'

type CatalogRow = {
  course_master_id: number
  course_title: string
  main_course_id: number
  main_course_title: string
  sub_variant_id?: number | null
  sub_variant_title?: string | null
  category_path: string
  has_base_fee?: boolean
  batch_count?: number
  batches_priced_count?: number
}

type MainCourseOption = { id: number; title: string; slug: string }
type Center = { id: number; name: string; slug: string }

type PendingApproval = {
  course_master_id: number
  center_id: number
  course_title: string
  course_slug: string
  center_name: string
  center_slug: string
  saved_at: string | null
}

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

export default function SuperAdminCourseFeesPage() {
  const [tab, setTab] = useState<Tab>('base-fees')
  const [loading, setLoading] = useState(true)
  const [catalogCourses, setCatalogCourses] = useState<CatalogRow[]>([])
  const [mainCourses, setMainCourses] = useState<MainCourseOption[]>([])
  const [baseFeeIds, setBaseFeeIds] = useState<Set<number>>(new Set())
  const [mainCourseFilter, setMainCourseFilter] = useState('')
  const [subProgramFilter, setSubProgramFilter] = useState('')
  const [selectCourseFilter, setSelectCourseFilter] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs' | 'done'>('all')
  const [centers, setCenters] = useState<Center[]>([])
  const [discounts, setDiscounts] = useState<CourseFeeDiscount[]>([])
  const [payments, setPayments] = useState<StudentFeePayment[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [courseBatches, setCourseBatches] = useState<CourseBatchFeeRow[]>([])
  const [feeForm, setFeeForm] = useState<FeeStructureInput>(EMPTY_FEE_FORM)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [discountForm, setDiscountForm] = useState({
    course_master_id: '',
    center_ids: [] as number[],
    name: '',
    discount_type: 'fixed' as 'fixed' | 'percent',
    discount_value: '',
    coupon_code: ''
  })
  const [discountMainCourseId, setDiscountMainCourseId] = useState('')
  const [discountSubProgramId, setDiscountSubProgramId] = useState('')
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const payQs = paymentStatusFilter ? `?status=${paymentStatusFilter}` : ''
      const [feesRes, catalogRes, centersRes, discRes, payRes, apprRes] = await Promise.all([
        superAdminFetch('/api/super-admin/course-fees', { headers: authHeaders() }),
        superAdminFetch('/api/super-admin/course-fees?catalog=1', { headers: authHeaders() }),
        superAdminFetch('/api/super-admin/centers', { headers: authHeaders() }),
        superAdminFetch('/api/super-admin/course-fees/discounts', { headers: authHeaders() }),
        superAdminFetch(`/api/super-admin/course-fees/payments${payQs}`, { headers: authHeaders() }),
        superAdminFetch('/api/super-admin/course-fees/pending-approvals', { headers: authHeaders() }),
      ])
      if (feesRes.ok) {
        const fees = await feesRes.json()
        setBaseFeeIds(new Set(fees.map((f: { course_master_id: number }) => f.course_master_id)))
      }
      if (catalogRes.ok) {
        const catalog = await catalogRes.json()
        setMainCourses(catalog.mainCourses || [])
        setCatalogCourses(catalog.courses || [])
      }
      if (centersRes.ok) setCenters(await centersRes.json())
      if (discRes.ok) setDiscounts(await discRes.json())
      if (payRes.ok) setPayments(await payRes.json())
      if (apprRes.ok) setPendingApprovals(await apprRes.json())
    } catch {
      setAlert({ type: 'error', message: 'Failed to load data. Please refresh.' })
    } finally {
      setLoading(false)
    }
  }, [paymentStatusFilter])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const enrichedCatalog = useMemo(
    () =>
      catalogCourses.map((c) => ({
        ...c,
        has_base_fee: c.has_base_fee ?? baseFeeIds.has(c.course_master_id)
      })),
    [catalogCourses, baseFeeIds]
  )

  const subProgramOptions = useMemo(() => {
    if (!mainCourseFilter) return []
    const rows = enrichedCatalog.filter((c) => String(c.main_course_id) === mainCourseFilter)
    const map = new Map<number, string>()
    for (const c of rows) {
      if (c.sub_variant_id != null) map.set(c.sub_variant_id, c.sub_variant_title || `Sub #${c.sub_variant_id}`)
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title))
  }, [enrichedCatalog, mainCourseFilter])

  const filtered = useMemo(() => {
    let rows = enrichedCatalog
    if (mainCourseFilter) rows = rows.filter((c) => String(c.main_course_id) === mainCourseFilter)
    if (subProgramOptions.length > 0) {
      if (!subProgramFilter) return []
      rows = rows.filter((c) => String(c.sub_variant_id) === subProgramFilter)
    }
    if (selectCourseFilter) rows = rows.filter((c) => String(c.course_master_id) === selectCourseFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (c) =>
          c.course_title?.toLowerCase().includes(q) ||
          c.category_path?.toLowerCase().includes(q) ||
          c.main_course_title?.toLowerCase().includes(q)
      )
    }
    if (statusFilter === 'needs') rows = rows.filter((c) => !c.has_base_fee)
    if (statusFilter === 'done') rows = rows.filter((c) => c.has_base_fee)
    return rows
  }, [enrichedCatalog, mainCourseFilter, subProgramFilter, subProgramOptions.length, selectCourseFilter, search, statusFilter])

  const counts = useMemo(
    () => ({
      all: enrichedCatalog.length,
      needs: enrichedCatalog.filter((c) => !c.has_base_fee).length,
      done: enrichedCatalog.filter((c) => c.has_base_fee).length
    }),
    [enrichedCatalog]
  )

  const selected = enrichedCatalog.find((c) => c.course_master_id === selectedId)

  const openEditor = (row: CatalogRow) => {
    setSelectedId(row.course_master_id)
    setSelectedBatchId('')
    setFeeForm(EMPTY_FEE_FORM)
  }

  const closeEditor = () => {
    setSelectedId(null)
    setSelectedBatchId('')
    setCourseBatches([])
    setFeeForm(EMPTY_FEE_FORM)
  }

  useEffect(() => {
    if (!selectedId) return
    void (async () => {
      const res = await superAdminFetch(`/api/super-admin/course-fees/batches?courseMasterId=${selectedId}`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setCourseBatches(data.batches || [])
      }
    })()
  }, [selectedId])

  useEffect(() => {
    if (!selectedId) return
    void (async () => {
      if (!selectedBatchId) {
        const res = await superAdminFetch('/api/super-admin/course-fees', { headers: authHeaders() })
        if (res.ok) {
          const fees = await res.json()
          const row = fees.find((f: { course_master_id: number }) => f.course_master_id === selectedId)
          setFeeForm(row ? feeInputFromRow(row) : { ...EMPTY_FEE_FORM })
        }
        return
      }
      const res = await superAdminFetch(`/api/super-admin/course-fees/batches?batchId=${selectedBatchId}`, { headers: authHeaders() })
      if (res.ok) {
        const fee = await res.json()
        if (fee) setFeeForm(feeInputFromRow(fee))
        else {
          const courseRes = await superAdminFetch('/api/super-admin/course-fees', { headers: authHeaders() })
          if (courseRes.ok) {
            const fees = await courseRes.json()
            const row = fees.find((f: { course_master_id: number }) => f.course_master_id === selectedId)
            setFeeForm(row ? feeInputFromRow(row) : { ...EMPTY_FEE_FORM })
          }
        }
      }
    })()
  }, [selectedId, selectedBatchId])

  const saveBaseFee = async () => {
    if (!selectedId) return
    const validation = validateFeeForm(feeForm)
    if (validation) {
      setAlert({ type: 'error', message: validation })
      return
    }
    setSaving(true)
    setAlert(null)
    try {
      const url = selectedBatchId
        ? withBasePath('/api/super-admin/course-fees/batches')
        : withBasePath('/api/super-admin/course-fees')
      const body = selectedBatchId
        ? { batch_id: Number(selectedBatchId), course_master_id: selectedId, ...feeForm }
        : { course_master_id: selectedId, ...feeForm }
      const res = await fetch(url, {
        credentials: 'include',
 method: 'POST', headers: authHeaders(), body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setAlert({ type: 'success', message: 'Base fee saved successfully.' })
      await loadAll()
      setFeeForm(feeInputFromRow(data))
    } catch (e) {
      setAlert({ type: 'error', message: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  const toggleDiscountCenter = (centerId: number) => {
    setDiscountForm((prev) => ({
      ...prev,
      center_ids: prev.center_ids.includes(centerId)
        ? prev.center_ids.filter((id) => id !== centerId)
        : [...prev.center_ids, centerId]
    }))
  }

  const selectAllDiscountCenters = () => {
    setDiscountForm((prev) => ({ ...prev, center_ids: centers.map((c) => c.id) }))
  }

  const clearDiscountCenters = () => {
    setDiscountForm((prev) => ({ ...prev, center_ids: [] }))
  }

  const saveDiscount = async () => {
    if (!discountForm.course_master_id || !discountForm.name || !discountForm.discount_value) {
      setAlert({ type: 'error', message: 'Select course (main → sub program → course), name, and discount value.' })
      return
    }
    setSaving(true)
    try {
      const res = await superAdminFetch('/api/super-admin/course-fees/discounts', { method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          course_master_id: Number(discountForm.course_master_id),
          center_ids: discountForm.center_ids,
          name: discountForm.name,
          discount_type: discountForm.discount_type,
          discount_value: Number(discountForm.discount_value),
          coupon_code: discountForm.coupon_code || null })
      })
      if (!res.ok) throw new Error('Failed to save discount')
      const created = (await res.json()) as unknown[]
      setDiscountForm({ course_master_id: '', center_ids: [], name: '', discount_type: 'fixed', discount_value: '', coupon_code: '' })
      setDiscountMainCourseId('')
      setDiscountSubProgramId('')
      setAlert({
        type: 'success',
        message:
          discountForm.center_ids.length === 0
            ? 'Global discount added for all centers.'
            : `Discount added for ${created.length} center(s).`
      })
      await loadAll()
    } catch (e) {
      setAlert({ type: 'error', message: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  const deleteDiscount = async (id: number) => {
    if (!(await confirmDialog({ message: 'Delete this discount?', destructive: true }))) return
    const res = await superAdminFetch(`/api/super-admin/course-fees/discounts?id=${id}`, { method: 'DELETE',
      headers: authHeaders() })
    if (res.ok) {
      setAlert({ type: 'success', message: 'Discount deleted.' })
      await loadAll()
    }
  }

  const approveCenterFee = async (row: PendingApproval) => {
    setSaving(true)
    try {
      const res = await superAdminFetch('/api/super-admin/course-fees/approve', { method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ course_master_id: row.course_master_id, center_id: row.center_id })
      })
      if (!res.ok) throw new Error('Approve failed')
      setAlert({ type: 'success', message: `Approved pricing for ${row.course_title} at ${row.center_name}.` })
      await loadAll()
    } catch (e) {
      setAlert({ type: 'error', message: e instanceof Error ? e.message : 'Approve failed' })
    } finally {
      setSaving(false)
    }
  }

  const copyPaymentLink = (centerSlug: string, courseSlug: string) => {
    const link = buildPaymentLink(centerSlug, courseSlug)
    const full = link.startsWith('http') ? link : `${window.location.origin}${link}`
    void navigator.clipboard.writeText(full)
    setAlert({ type: 'success', message: 'Payment link copied to clipboard.' })
  }

  const exportPaymentsCsv = async () => {
    const qs = paymentStatusFilter ? `?export=csv&status=${paymentStatusFilter}` : '?export=csv'
    const res = await superAdminFetch(`/api/super-admin/course-fees/payments${qs}`, { headers: authHeaders() })
    if (!res.ok) {
      setAlert({ type: 'error', message: 'Export failed' })
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'all-payments.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const paymentSummary = useMemo(
    () => ({
      completed: payments.filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount_paid, 0),
      pending: payments.filter((p) => p.status === 'pending').length,
      refunded: payments.filter((p) => p.status === 'refunded').length
    }),
    [payments]
  )

  const tabs: Array<{ id: Tab; label: string; icon: typeof IndianRupee }> = [
    { id: 'base-fees', label: 'Base Fees', icon: IndianRupee },
    { id: 'discounts', label: 'Discounts', icon: Percent },
    { id: 'approvals', label: `Approvals (${pendingApprovals.length})`, icon: CheckCircle },
    { id: 'payments', label: 'Payments', icon: CreditCard },
  ]

  if (loading) return <AdminPageSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-purple-600" />
            Course Fee Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Master pricing for all Course Masters. Centers assign courses in{' '}
            <Link href={withBasePath('/super-admin/courses')} className="text-purple-600 hover:underline inline-flex items-center gap-1">
              Courses Management
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </p>
        </div>
        <button type="button" onClick={() => void loadAll()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {alert ? <FeeAlert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

      <div className="flex flex-wrap gap-2 border-b pb-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium ${
              tab === id ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'base-fees' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-white dark:bg-gray-800 p-4">
              <p className="text-sm text-gray-500">All courses</p>
              <p className="text-2xl font-bold">{counts.all}</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 p-4">
              <p className="text-sm text-green-700">Base fee set</p>
              <p className="text-2xl font-bold text-green-800">{counts.done}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4">
              <p className="text-sm text-amber-700">Needs base fee</p>
              <p className="text-2xl font-bold text-amber-800">{counts.needs}</p>
            </div>
          </div>

          <CourseFeeCatalogFilters
            mainCourses={mainCourses}
            catalog={enrichedCatalog}
            mainCourseId={mainCourseFilter}
            subProgramId={subProgramFilter}
            courseId={selectCourseFilter}
            onMainCourseChange={(value) => {
              setMainCourseFilter(value)
              setSubProgramFilter('')
              setSelectCourseFilter('')
            }}
            onSubProgramChange={(value) => {
              setSubProgramFilter(value)
              setSelectCourseFilter('')
            }}
            onCourseChange={setSelectCourseFilter}
            mainEmptyLabel="Choose main course..."
            search={{ value: search, onChange: setSearch, placeholder: 'Search course path...' }}
            statusPills={(['all', 'needs', 'done'] as const).map((key) => ({
              key,
              label: key === 'all' ? `All (${counts.all})` : key === 'needs' ? `Needs (${counts.needs})` : `Set (${counts.done})`,
              active: statusFilter === key,
              onClick: () => setStatusFilter(key)
            }))}
          />

          <div className="rounded-xl border overflow-hidden bg-white dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Course path</th>
                  <th className="text-left px-4 py-3 font-semibold">Main course</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                      {!mainCourseFilter
                        ? 'Select a main course to begin.'
                        : subProgramOptions.length > 0 && !subProgramFilter
                          ? 'Select a sub program to see courses.'
                          : 'No courses match your filters.'}
                    </td>
                  </tr>
                ) : filtered.map((row) => (
                  <tr key={row.course_master_id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.course_title}</div>
                      <div className="text-xs text-gray-500">{row.category_path}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.main_course_title}</td>
                    <td className="px-4 py-3">
                      <FeeStatusBadge status={row.has_base_fee ? 'saved' : 'needs_pricing'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openEditor(row)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium">
                        <Pencil className="w-3.5 h-3.5" />
                        {row.has_base_fee ? 'Edit fee' : 'Set fee'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : tab === 'discounts' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-white dark:bg-gray-800 p-6 admin-form space-y-4">
            <h3 className="font-semibold">Create discount</h3>

            <section className="admin-form-section border border-gray-200 dark:border-gray-700">
              <div className="admin-form-section__header">
                <span className="admin-form-section__number">1</span>
                <div>
                  <h4 className="admin-form-section__title">Course selection</h4>
                  <p className="admin-form-section__description">Choose main course, sub program, then the target course</p>
                </div>
              </div>
              <div className="admin-form-section__body">
                <CourseFeeCourseCascade
                  mainCourses={mainCourses}
                  catalog={enrichedCatalog}
                  mainCourseId={discountMainCourseId}
                  subProgramId={discountSubProgramId}
                  courseId={discountForm.course_master_id}
                  onMainCourseChange={(value) => {
                    setDiscountMainCourseId(value)
                    setDiscountSubProgramId('')
                    setDiscountForm((prev) => ({ ...prev, course_master_id: '' }))
                  }}
                  onSubProgramChange={(value) => {
                    setDiscountSubProgramId(value)
                    setDiscountForm((prev) => ({ ...prev, course_master_id: '' }))
                  }}
                  onCourseChange={(value) => setDiscountForm((prev) => ({ ...prev, course_master_id: value }))}
                />
              </div>
            </section>

            <section className="admin-form-section border border-gray-200 dark:border-gray-700">
              <div className="admin-form-section__header">
                <span className="admin-form-section__number">2</span>
                <div>
                  <h4 className="admin-form-section__title">Discount details</h4>
                  <p className="admin-form-section__description">Set center scope, amount, and optional coupon</p>
                </div>
              </div>
              <div className="admin-form-section__body space-y-4">
                <AdminFormField
                  label="Centers"
                  hint={
                    discountForm.center_ids.length === 0
                      ? 'No centers selected — discount applies globally to all centers.'
                      : `${discountForm.center_ids.length} center(s) selected.`
                  }
                >
                  <div className="mb-2 flex flex-wrap gap-2">
                    <AdminButton type="button" variant="secondary" size="xs" onClick={selectAllDiscountCenters}>
                      Select all
                    </AdminButton>
                    <AdminButton type="button" variant="secondary" size="xs" onClick={clearDiscountCenters}>
                      Clear
                    </AdminButton>
                  </div>
                  <div className="admin-form-checkgroup admin-form-checkgroup--2 max-h-48 overflow-y-auto">
                    {centers.length === 0 ? (
                      <p className="admin-form-hint mb-0">No centers available.</p>
                    ) : (
                      centers.map((c) => (
                        <label key={c.id} className="admin-form-check">
                          <input
                            type="checkbox"
                            checked={discountForm.center_ids.includes(c.id)}
                            onChange={() => toggleDiscountCenter(c.id)}
                          />
                          <span>{c.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </AdminFormField>
                <AdminFormField label="Discount name">
                  <input
                    placeholder="Discount name"
                    value={discountForm.name}
                    onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                    className="admin-form-control"
                  />
                </AdminFormField>
                <div className="admin-form-row admin-form-row--2">
                  <AdminFormField label="Type">
                    <select
                      value={discountForm.discount_type}
                      onChange={(e) =>
                        setDiscountForm({ ...discountForm, discount_type: e.target.value as 'fixed' | 'percent' })
                      }
                      className="admin-form-control"
                    >
                      <option value="fixed">Fixed ₹</option>
                      <option value="percent">Percent %</option>
                    </select>
                  </AdminFormField>
                  <AdminFormField label="Value">
                    <input
                      type="number"
                      placeholder="Value"
                      value={discountForm.discount_value}
                      onChange={(e) => setDiscountForm({ ...discountForm, discount_value: e.target.value })}
                      className="admin-form-control"
                    />
                  </AdminFormField>
                </div>
                <AdminFormField label="Coupon code" hint="Optional">
                  <input
                    placeholder="Coupon code (optional)"
                    value={discountForm.coupon_code}
                    onChange={(e) => setDiscountForm({ ...discountForm, coupon_code: e.target.value })}
                    className="admin-form-control"
                  />
                </AdminFormField>
              </div>
            </section>

            <AdminButton type="button" variant="primary" size="sm" disabled={saving} onClick={() => void saveDiscount()}>
              Add discount
            </AdminButton>
          </div>
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="text-left px-4 py-3">Name</th><th className="text-left px-4 py-3">Course</th><th className="text-left px-4 py-3">Center</th><th className="text-left px-4 py-3">Value</th><th className="text-right px-4 py-3"></th></tr></thead>
              <tbody>
                {discounts.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No discounts yet.</td></tr> : discounts.map((d) => (
                  <tr key={d.id} className="border-t"><td className="px-4 py-3">{d.name}</td><td className="px-4 py-3">{d.course_title}</td><td className="px-4 py-3">{d.center_name || 'All centers'}</td><td className="px-4 py-3">{d.discount_type === 'percent' ? `${d.discount_value}%` : formatInr(d.discount_value)}</td><td className="px-4 py-3 text-right"><button aria-label="Delete" type="button" onClick={() => void deleteDiscount(d.id)} className="text-red-600"><Trash2 className="w-4 h-4 inline" /></button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'approvals' ? (
        <div className="rounded-xl border overflow-hidden bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="text-left px-4 py-3">Course</th>
                <th className="text-left px-4 py-3">Center</th>
                <th className="text-left px-4 py-3">Saved</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingApprovals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No center pricing awaiting approval.
                  </td>
                </tr>
              ) : (
                pendingApprovals.map((row) => (
                  <tr key={`${row.center_id}-${row.course_master_id}`} className="border-t">
                    <td className="px-4 py-3">{row.course_title}</td>
                    <td className="px-4 py-3">{row.center_name}</td>
                    <td className="px-4 py-3">{row.saved_at ? new Date(row.saved_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => copyPaymentLink(row.center_slug, row.course_slug)}
                        className="text-xs text-purple-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Link
                      </button>
                      <AdminButton type="button" variant="primary" size="sm" disabled={saving} onClick={() => void approveCenterFee(row)}>
                        Approve
                      </AdminButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
              <p className="text-sm text-gray-500">Completed revenue</p>
              <p className="text-xl font-bold">{formatInr(paymentSummary.completed)}</p>
            </div>
            <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold">{paymentSummary.pending}</p>
            </div>
            <div className="rounded-xl border p-4 bg-white dark:bg-gray-800">
              <p className="text-sm text-gray-500">Refunded</p>
              <p className="text-xl font-bold">{paymentSummary.refunded}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="admin-form-control text-sm"
            >
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <AdminButton type="button" variant="secondary" size="sm" onClick={() => void exportPaymentsCsv()}>
              <Download className="w-4 h-4" />
              Export CSV
            </AdminButton>
          </div>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50"><tr><th className="text-left px-4 py-3">Receipt</th><th className="text-left px-4 py-3">Student</th><th className="text-left px-4 py-3">Course</th><th className="text-left px-4 py-3">Center</th><th className="text-right px-4 py-3">Amount</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Date</th></tr></thead>
            <tbody>
              {payments.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No payments recorded.</td></tr> : payments.map((p) => (
                <tr key={p.id} className="border-t"><td className="px-4 py-3 font-mono text-xs">{p.receipt_no}</td><td className="px-4 py-3"><div>{p.student_name}</div><div className="text-xs text-gray-500">{p.student_mobile}</div></td><td className="px-4 py-3">{p.course_title}</td><td className="px-4 py-3">{p.center_name}</td><td className="px-4 py-3 text-right">{formatInr(p.amount_paid)}</td><td className="px-4 py-3 capitalize">{p.status}</td><td className="px-4 py-3">{p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      <FormModal
        isOpen={Boolean(selected)}
        onClose={closeEditor}
        title={selected?.course_title || 'Base fee'}
        description={selected?.category_path}
        size="large"
        formError={validateFeeForm(feeForm) || undefined}
        footer={
          <div className="admin-btn-group admin-btn-group--end admin-modal__footer-actions">
            <AdminButton type="button" variant="secondary" size="sm" onClick={closeEditor} disabled={saving}>
              Cancel
            </AdminButton>
            <AdminButton
              type="button"
              variant="primary"
              size="sm"
              disabled={saving || Boolean(validateFeeForm(feeForm))}
              onClick={() => void saveBaseFee()}
            >
              {saving ? 'Saving...' : 'Save base fee'}
            </AdminButton>
          </div>
        }
      >
        {courseBatches.length > 0 ? (
          <AdminFormField
            label="Pricing scope"
            hint={`${courseBatches.length} batch(es) — set fee per batch or use course default`}
          >
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="admin-form-control"
            >
              <option value="">Course default (all batches)</option>
              {courseBatches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.batch_name || `Batch #${b.id}`}
                  {b.batch_timing ? ` · ${b.batch_timing}` : ''}
                  {b.has_base_fee ? ' ✓ priced' : ' (needs fee)'}
                </option>
              ))}
            </select>
          </AdminFormField>
        ) : null}
        <CourseFeeStructureForm value={feeForm} onChange={setFeeForm} />
      </FormModal>
    </div>
  )
}
