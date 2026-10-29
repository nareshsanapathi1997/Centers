'use client'
import { authenticatedFetch } from '@/lib/admin-api'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { withBasePath } from '@/lib/with-base-path'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminPageSpinner from '@/components/admin/AdminPageSpinner'
import AdminButton from '@/components/admin/AdminButton'
import AdminFormField from '@/components/admin/AdminFormField'
import FormModal from '@/components/admin/FormModal'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import CourseFeeCatalogFilters from '@/components/admin/course-fees/CourseFeeCatalogFilters'
import CourseFeeStructureForm from '@/components/admin/course-fees/CourseFeeStructureForm'
import FeeAlert from '@/components/admin/course-fees/FeeAlert'
import FeeStatusBadge from '@/components/admin/course-fees/FeeStatusBadge'
import {
  EMPTY_FEE_FORM,
  type CourseBatchFeeRow,
  type FeeStructureInput
} from '@/lib/course-fees-types'
import type { CenterCoursePricingRow } from '@/lib/course-fees-db'
import type { MainCourseFilterOption } from '@/lib/course-fees-db'
import { IndianRupee, Layers, Link2, Pencil } from 'lucide-react'
import { feeInputFromRow, formatInr, validateFeeForm, buildPaymentLink } from '@/lib/course-fees-utils'

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

type FilterTab = 'all' | 'needs_pricing' | 'saved' | 'partial'

export default function CenterCourseFeesPage({ params }: { params: { centerId: string } }) {
  const centerId = params.centerId
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<CenterCoursePricingRow[]>([])
  const [mainCourses, setMainCourses] = useState<MainCourseFilterOption[]>([])
  const [filter, setFilter] = useState<FilterTab>('all')
  const [mainCourseId, setMainCourseId] = useState<string>('')
  const [subProgramId, setSubProgramId] = useState<string>('')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [courseBatches, setCourseBatches] = useState<CourseBatchFeeRow[]>([])
  const [feeForm, setFeeForm] = useState<FeeStructureInput>(EMPTY_FEE_FORM)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const copyPaymentLink = (centerSlug: string, courseSlug: string) => {
    const link = buildPaymentLink(centerSlug, courseSlug)
    const full = link.startsWith('http') ? link : `${window.location.origin}${link}`
    void navigator.clipboard.writeText(full)
    setAlert({ type: 'success', message: 'Public payment link copied.' })
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const coursesRes = await authenticatedFetch(`/api/admin/course-fees?centerId=${centerId}`, { headers: authHeaders() })
      if (coursesRes.ok) {
        const data = await coursesRes.json()
        setCourses(Array.isArray(data.courses) ? data.courses : [])
        setMainCourses(Array.isArray(data.mainCourses) ? data.mainCourses : [])
      } else {
        setAlert({ type: 'error', message: 'Could not load courses for this center.' })
      }
    } finally {
      setLoading(false)
    }
  }, [centerId])

  useEffect(() => {
    load()
  }, [load])

  const subProgramOptions = useMemo(() => {
    let rows = courses
    if (mainCourseId) rows = rows.filter((c) => String(c.main_course_id) === mainCourseId)
    const map = new Map<number, string>()
    for (const c of rows) {
      if (c.sub_variant_id != null) {
        map.set(c.sub_variant_id, c.sub_variant_title || `Sub program #${c.sub_variant_id}`)
      }
    }
    return Array.from(map.entries())
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [courses, mainCourseId])

  const filtered = useMemo(() => {
    let rows = courses
    if (mainCourseId) {
      rows = rows.filter((c) => String(c.main_course_id) === mainCourseId)
    }
    if (subProgramOptions.length > 0) {
      if (!subProgramId) return []
      rows = rows.filter((c) => String(c.sub_variant_id) === subProgramId)
    }
    if (selectedCourseId) {
      rows = rows.filter((c) => String(c.course_master_id) === selectedCourseId)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (c) =>
          c.course_title?.toLowerCase().includes(q) ||
          c.main_course_title?.toLowerCase().includes(q) ||
          c.category_path?.toLowerCase().includes(q)
      )
    }
    if (filter === 'needs_pricing') return rows.filter((c) => c.pricing_status === 'needs_pricing')
    if (filter === 'partial') return rows.filter((c) => c.pricing_status === 'partial')
    if (filter === 'saved') return rows.filter((c) => c.pricing_status === 'saved' || c.pricing_status === 'approved')
    return rows
  }, [courses, filter, mainCourseId, subProgramId, subProgramOptions.length, selectedCourseId, search])

  const counts = useMemo(
    () => ({
      all: courses.length,
      needs_pricing: courses.filter((c) => c.pricing_status === 'needs_pricing').length,
      partial: courses.filter((c) => c.pricing_status === 'partial').length,
      saved: courses.filter((c) => c.pricing_status === 'saved' || c.pricing_status === 'approved').length
    }),
    [courses]
  )

  const selected = courses.find((c) => c.course_master_id === selectedId)

  const applyFeeSource = (source: FeeStructureInput) => {
    setFeeForm(feeInputFromRow(source))
  }

  const openEditor = (course: CenterCoursePricingRow) => {
    setSelectedId(course.course_master_id)
    setSelectedBatchId('')
    const source =
      course.center_fee?.status === 'saved' || course.center_fee?.status === 'approved'
        ? course.center_fee
        : course.base_fee || EMPTY_FEE_FORM
    applyFeeSource(source)
  }

  useEffect(() => {
    if (!selectedId) {
      setCourseBatches([])
      return
    }
    const loadBatches = async () => {
      const res = await authenticatedFetch(`/api/admin/course-fees/batches?centerId=${centerId}&courseMasterId=${selectedId}`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setCourseBatches(data.batches || [])
      } else {
        setCourseBatches([])
      }
    }
    void loadBatches()
  }, [selectedId, centerId])

  useEffect(() => {
    if (!selectedId || !selected) return
    const loadBatchFee = async () => {
      if (!selectedBatchId) {
        const source =
          selected.center_fee?.status === 'saved' || selected.center_fee?.status === 'approved'
            ? selected.center_fee
            : selected.base_fee || EMPTY_FEE_FORM
        applyFeeSource(source)
        return
      }
      const res = await authenticatedFetch(`/api/admin/course-fees/batches?centerId=${centerId}&courseMasterId=${selectedId}&batchId=${selectedBatchId}`, { headers: authHeaders() })
      if (res.ok) {
        const fee = await res.json()
        if (fee) applyFeeSource(fee)
        else {
          const batchRow = courseBatches.find((b) => String(b.id) === selectedBatchId)
          if (batchRow?.base_amount != null && selected.base_fee) {
            applyFeeSource(selected.base_fee)
          } else if (selected.base_fee) {
            applyFeeSource(selected.base_fee)
          } else {
            applyFeeSource(EMPTY_FEE_FORM)
          }
        }
      }
    }
    void loadBatchFee()
  }, [selectedBatchId, selectedId, selected, centerId, courseBatches])

  const closeEditor = () => {
    setSelectedId(null)
    setSelectedBatchId('')
    setCourseBatches([])
    setFeeForm(EMPTY_FEE_FORM)
  }

  const saveFee = async () => {
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
        ? withBasePath('/api/admin/course-fees/batches')
        : withBasePath('/api/admin/course-fees')
      const body = selectedBatchId
        ? {
            center_id: Number(centerId),
            course_master_id: selectedId,
            batch_id: Number(selectedBatchId),
            ...feeForm,
            configured_by: 'center',
            status: 'saved'
          }
        : {
            center_id: Number(centerId),
            course_master_id: selectedId,
            ...feeForm,
            configured_by: 'center',
            status: 'saved'
          }
      const res = await fetch(url, {
        credentials: 'include',

        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to save pricing')
      setAlert({ type: 'success', message: 'Pricing saved successfully.' })
      await load()
      closeEditor()
    } catch (e) {
      setAlert({ type: 'error', message: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <IndianRupee className="h-7 w-7" />
              Course Pricing
            </span>
          }
          description="Only main courses assigned to your center in Courses Management are shown, with their sub-programs and courses from Course Masters."
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${centerId}` },
            { label: 'Course Fees' },
          ]}
        />

        {loading ? <AdminPageSpinner /> : null}

        {alert ? <FeeAlert type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} /> : null}

        {!loading && courses.length === 0 ? (
          <EmptyState
            title="No courses assigned"
            message="Super Admin must add courses in Courses Management before you can set pricing."
            icon={Layers}
          />
        ) : null}

        {!loading && courses.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="admin-card p-4">
              <p className="text-sm text-[var(--cm-color-text-muted)]">Total courses</p>
              <p className="text-2xl font-bold">{counts.all}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-900/20">
              <p className="text-sm text-amber-700 dark:text-amber-300">Needs pricing</p>
              <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">{counts.needs_pricing}</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:bg-green-900/20">
              <p className="text-sm text-green-700 dark:text-green-300">Pricing saved</p>
              <p className="text-2xl font-bold text-green-800 dark:text-green-200">{counts.saved}</p>
            </div>
          </div>

          <CourseFeeCatalogFilters
            mainCourses={mainCourses}
            catalog={courses}
            mainCourseId={mainCourseId}
            subProgramId={subProgramId}
            courseId={selectedCourseId}
            onMainCourseChange={(value) => {
              setMainCourseId(value)
              setSubProgramId('')
              setSelectedCourseId('')
            }}
            onSubProgramChange={(value) => {
              setSubProgramId(value)
              setSelectedCourseId('')
            }}
            onCourseChange={setSelectedCourseId}
            mainEmptyLabel={mainCourses.length === 0 ? 'No main courses assigned' : 'Choose main course...'}
            search={{ value: search, onChange: setSearch, placeholder: 'Search course path...' }}
            statusPills={(
              [
                ['all', `All (${counts.all})`],
                ['needs_pricing', `Needs pricing (${counts.needs_pricing})`],
                ['partial', `Partial batches (${counts.partial})`],
                ['saved', `Saved (${counts.saved})`],
              ] as const
            ).map(([key, label]) => ({
              key,
              label,
              active: filter === key,
              onClick: () => setFilter(key)
            }))}
          />

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Course path (Course Masters)</th>
                  <th className="px-4 py-3 text-left font-semibold">Batches</th>
                  <th className="px-4 py-3 text-right font-semibold">Base price</th>
                  <th className="text-right px-4 py-3 font-semibold">Your price</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {!mainCourseId
                        ? 'Select a main course to begin.'
                        : subProgramOptions.length > 0 && !subProgramId
                          ? 'Select a sub program to see courses.'
                          : 'No courses match your filters.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((course) => (
                    <tr key={course.course_master_id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{course.course_title}</div>
                        <div className="text-xs text-gray-500">{course.category_path}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {(course.batch_count || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Layers className="w-3.5 h-3.5" />
                            {course.batches_priced_count}/{course.batch_count}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatInr(course.base_amount)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatInr(course.center_amount)}</td>
                      <td className="px-4 py-3">
                        <FeeStatusBadge
                          status={course.pricing_status === 'partial' ? 'partial' : course.pricing_status === 'needs_pricing' ? 'needs_pricing' : 'saved'}
                          batchCount={course.batch_count}
                          batchesPriced={course.batches_priced_count}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {(course.pricing_status === 'saved' || course.pricing_status === 'approved') &&
                          course.center_slug &&
                          course.course_slug ? (
                            <button
                              type="button"
                              onClick={() => copyPaymentLink(course.center_slug!, course.course_slug!)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                              title="Copy public payment link"
                            >
                              <Link2 className="w-3.5 h-3.5" />
                              Pay link
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openEditor(course)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            {course.pricing_status === 'needs_pricing' ? 'Set price' : 'Edit price'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
        ) : null}

      <FormModal
        isOpen={Boolean(selected)}
        onClose={closeEditor}
        title={selected?.course_title || 'Course pricing'}
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
              onClick={saveFee}
            >
              {saving ? 'Saving...' : 'Save pricing'}
            </AdminButton>
          </div>
        }
      >
        {selected?.base_amount != null ? (
          <div className="admin-form-section-note border border-dashed border-green-300 dark:border-green-600/50 bg-green-50 dark:bg-green-950/40 text-green-900 dark:text-green-100 mb-4">
            Super Admin base price: <strong>{formatInr(selected.base_amount)}</strong>
          </div>
        ) : (
          <div className="admin-form-section-note border border-dashed border-amber-300 dark:border-amber-600/50 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 mb-4">
            No base price from Super Admin — define full fee for your center.
          </div>
        )}
        {courseBatches.length > 0 ? (
          <AdminFormField label="Pricing scope" hint="Set fee for a specific batch or use course default">
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
                  {b.start_date ? ` · ${b.start_date}` : ''}
                  {b.has_center_fee ? ' ✓ saved' : b.has_base_fee ? ' (base set)' : ''}
                </option>
              ))}
            </select>
          </AdminFormField>
        ) : null}
        <CourseFeeStructureForm value={feeForm} onChange={setFeeForm} />
      </FormModal>
      </div>
    </AdminPageShell>
  )
}
