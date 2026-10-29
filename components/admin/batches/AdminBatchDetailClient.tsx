'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Plus, Trash2, UserMinus, UserPlus } from 'lucide-react'
import { authenticatedFetch } from '@/lib/admin-api'
import { toast, confirmDialog } from '@/lib/admin-ui-store'
import { useAdminPermissions, hasAdminGrant } from '@/lib/use-admin-permissions'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminButton from '@/components/admin/AdminButton'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import AdminErrorState from '@/components/admin/AdminErrorState'
import { Input, Select } from '@/components/forms'
import type { BatchEnrollmentRow, CourseBatchRow } from '@/lib/course-batches-types'
import BatchFormFields, {
  batchStatusLabel,
  batchToForm,
  formToPayload,
  statusBadgeClass,
  type BatchFormState,
  type CourseOption,
  type FacultyOption,
  type PricingBatchOption,
  EMPTY_BATCH_FORM,
} from '@/components/admin/batches/BatchFormFields'

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(value).slice(0, 10)
  }
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

type StudentOption = {
  id: number
  full_name: string
  mobile?: string | null
  regno?: string | null
}

export default function AdminBatchDetailClient({
  centerId,
  batchId,
}: {
  centerId: string
  batchId: string
}) {
  const { access } = useAdminPermissions(centerId)
  const canEdit = hasAdminGrant(access, 'batches', 'update')
  const canDelete = hasAdminGrant(access, 'batches', 'delete')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [batch, setBatch] = useState<CourseBatchRow | null>(null)
  const [enrollments, setEnrollments] = useState<BatchEnrollmentRow[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<BatchFormState>({ ...EMPTY_BATCH_FORM, centerId })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [faculty, setFaculty] = useState<FacultyOption[]>([])
  const [pricingBatches, setPricingBatches] = useState<PricingBatchOption[]>([])

  const [enrollOpen, setEnrollOpen] = useState(false)
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([])
  const [studentId, setStudentId] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authenticatedFetch(
        `/api/admin/batches/${batchId}?centerId=${centerId}`,
        { headers: authHeaders() }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      setBatch(data.batch)
      setEnrollments(data.enrollments || [])
    } catch (err) {
      setError(err)
      setBatch(null)
      setEnrollments([])
    } finally {
      setLoading(false)
    }
  }, [centerId, batchId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    authenticatedFetch(`/api/admin/batches/options?centerId=${centerId}`, {
      headers: authHeaders(),
    })
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        setCourses(data.courses || [])
        setFaculty(data.employees || [])
        setPricingBatches(data.pricingBatches || [])
      })
      .catch(() => {})
  }, [centerId])

  const loadStudents = useCallback(async () => {
    const qs = new URLSearchParams({ centerId })
    if (studentSearch.trim()) qs.set('search', studentSearch.trim())
    const res = await authenticatedFetch(`/api/admin/students?${qs}`, {
      headers: authHeaders(),
    })
    if (!res.ok) return
    const data = await res.json()
    setStudentOptions(data.students || [])
  }, [centerId, studentSearch])

  useEffect(() => {
    if (!enrollOpen) return
    void loadStudents()
  }, [enrollOpen, loadStudents])

  const enrolledIds = useMemo(
    () => new Set(enrollments.filter((e) => e.status === 'active').map((e) => e.student_id)),
    [enrollments]
  )

  const openEdit = () => {
    if (!batch) return
    setForm(batchToForm(batch, centerId))
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!batch) return
    setSaving(true)
    setFormError('')
    try {
      const payload = formToPayload({ ...form, centerId })
      const res = await authenticatedFetch(`/api/admin/batches/${batch.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Failed to update batch')
        return
      }
      toast.success('Batch updated')
      setModalOpen(false)
      void load()
    } catch {
      setFormError('Failed to update batch')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!batch) return
    const ok = await confirmDialog({
      title: 'Delete batch',
      message: `Delete ${batch.name}? This removes enrollments and attendance.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    const res = await authenticatedFetch(
      `/api/admin/batches/${batch.id}?centerId=${centerId}`,
      { method: 'DELETE', headers: authHeaders() }
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Delete failed')
      return
    }
    toast.success('Batch deleted')
    window.location.href = `/admin/${centerId}/batches`
  }

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId) {
      setEnrollError('Select a student')
      return
    }
    setEnrolling(true)
    setEnrollError('')
    try {
      const res = await authenticatedFetch(
        `/api/admin/batches/${batchId}/enrollments?centerId=${centerId}`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ studentId: Number(studentId) }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEnrollError(data.error || 'Failed to enroll student')
        return
      }
      toast.success('Student enrolled')
      setEnrollOpen(false)
      setStudentId('')
      void load()
    } catch {
      setEnrollError('Failed to enroll student')
    } finally {
      setEnrolling(false)
    }
  }

  const handleRemove = async (row: BatchEnrollmentRow) => {
    const ok = await confirmDialog({
      title: 'Remove student',
      message: `Remove ${row.student_name || 'this student'} from the batch?`,
      confirmLabel: 'Remove',
      destructive: true,
    })
    if (!ok) return
    const res = await authenticatedFetch(
      `/api/admin/batches/${batchId}/enrollments?centerId=${centerId}&studentId=${row.student_id}`,
      { method: 'DELETE', headers: authHeaders() }
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Remove failed')
      return
    }
    toast.success('Student removed')
    void load()
  }

  const columns: AdminTableColumn<BatchEnrollmentRow>[] = [
    {
      key: 'student_name',
      header: 'Student',
      sortValue: (r) => r.student_name,
      render: (r) => r.student_name || '—',
    },
    {
      key: 'regno',
      header: 'Reg. no',
      hideOnMobile: true,
      render: (r) => r.student_regno || '—',
    },
    {
      key: 'mobile',
      header: 'Mobile',
      hideOnMobile: true,
      render: (r) => r.student_mobile || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => r.status,
    },
    {
      key: 'enrolled_at',
      header: 'Enrolled',
      hideOnMobile: true,
      render: (r) => formatDate(r.enrolled_at),
    },
    {
      key: 'actions',
      header: '',
      render: (r) =>
        canEdit && r.status === 'active' ? (
          <AdminButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleRemove(r)}
          >
            <UserMinus className="h-4 w-4" />
            Remove
          </AdminButton>
        ) : null,
    },
  ]

  if (loading) {
    return (
      <AdminPageShell>
        <LoadingSkeleton rows={6} />
      </AdminPageShell>
    )
  }

  if (error || !batch) {
    return (
      <AdminPageShell>
        <AdminErrorState error={error || new Error('Batch not found')} onRetry={() => void load()} />
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell>
      <div className="mb-4">
        <Link
          href={`/admin/${centerId}/batches`}
          className="inline-flex items-center gap-1 text-sm text-[var(--cm-color-text-muted)] hover:text-[var(--cm-color-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to batches
        </Link>
      </div>

      <PageHeader
        title={batch.name}
        description={batch.course_title || 'Class batch'}
        breadcrumbs={[
          { label: 'Dashboard', href: `/admin/${centerId}/dashboard` },
          { label: 'Batches', href: `/admin/${centerId}/batches` },
          { label: batch.name },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <AdminButton
                type="button"
                variant="secondary"
                onClick={openEdit}
                icon={<Pencil className="h-4 w-4" />}
              >
                Edit
              </AdminButton>
            ) : null}
            {canDelete ? (
              <AdminButton
                type="button"
                variant="danger"
                onClick={() => void handleDelete()}
                icon={<Trash2 className="h-4 w-4" />}
              >
                Delete
              </AdminButton>
            ) : null}
          </div>
        }
      />

      <div className="mb-6 rounded-lg border border-[var(--cm-color-border)] bg-[var(--cm-color-surface)] p-4">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Code" value={batch.code || '—'} />
          <DetailItem
            label="Status"
            value={
              <span className={statusBadgeClass(batch.status)}>
                {batchStatusLabel(batch.status)}
              </span>
            }
          />
          <DetailItem label="Course" value={batch.course_title} />
          <DetailItem
            label="Pricing batch"
            value={
              batch.pricing_batch_name
                ? `${batch.pricing_batch_name}${
                    batch.pricing_batch_timing ? ` · ${batch.pricing_batch_timing}` : ''
                  }`
                : 'Not linked'
            }
          />
          <DetailItem label="Faculty" value={batch.faculty_name || '—'} />
          <DetailItem label="Start" value={formatDate(batch.start_date)} />
          <DetailItem label="End" value={formatDate(batch.end_date)} />
          <DetailItem
            label="Capacity"
            value={
              batch.capacity != null
                ? `${batch.enrolled_count ?? 0} / ${batch.capacity}`
                : `${batch.enrolled_count ?? 0} enrolled`
            }
          />
          <DetailItem label="Notes" value={batch.notes || '—'} />
        </dl>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--cm-color-text)]">Enrolled students</h2>
        {canEdit ? (
          <AdminButton
            type="button"
            onClick={() => {
              setEnrollError('')
              setStudentId('')
              setEnrollOpen(true)
            }}
            icon={<UserPlus className="h-4 w-4" />}
          >
            Add student
          </AdminButton>
        ) : null}
      </div>

      <AdminDataTable
        columns={columns}
        rows={enrollments}
        rowKey={(r) => r.id}
        emptyMessage="No students enrolled. Add students from this center’s student accounts."
        emptyIcon={<Plus className="h-12 w-12" />}
      />

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit batch"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <BatchFormFields
            form={form}
            onChange={setForm}
            courses={courses}
            faculty={faculty}
            pricingBatches={pricingBatches}
          />
          {formError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
          ) : null}
          <FormModalActions
            onCancel={() => setModalOpen(false)}
            submitLabel="Save changes"
            isSubmitting={saving}
          />
        </form>
      </FormModal>

      <FormModal
        isOpen={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        title="Enroll student"
        description="Select a student portal account from this center."
      >
        <form onSubmit={handleEnroll} className="space-y-4">
          <Input
            placeholder="Search students…"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
          />
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
            <option value="">Select student</option>
            {studentOptions
              .filter((s) => !enrolledIds.has(s.id))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                  {s.regno ? ` · ${s.regno}` : ''}
                  {s.mobile ? ` · ${s.mobile}` : ''}
                </option>
              ))}
          </Select>
          {enrollError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{enrollError}</p>
          ) : null}
          <FormModalActions
            onCancel={() => setEnrollOpen(false)}
            submitLabel="Enroll"
            isSubmitting={enrolling}
          />
        </form>
      </FormModal>
    </AdminPageShell>
  )
}
