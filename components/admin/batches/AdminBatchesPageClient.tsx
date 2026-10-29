'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Layers, Plus, Search } from 'lucide-react'
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
import { BATCH_STATUSES, type CourseBatchRow } from '@/lib/course-batches-types'
import BatchFormFields, {
  EMPTY_BATCH_FORM,
  batchStatusLabel,
  formToPayload,
  statusBadgeClass,
  type BatchFormState,
  type CourseOption,
  type FacultyOption,
  type PricingBatchOption,
} from '@/components/admin/batches/BatchFormFields'

type PageInfo = { page: number; pageSize: number; total: number; totalPages: number }

const PAGE_SIZE = 25

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

export default function AdminBatchesPageClient({ centerId }: { centerId: string }) {
  const { access } = useAdminPermissions(centerId)
  const canCreate = hasAdminGrant(access, 'batches', 'create')
  const canEdit = hasAdminGrant(access, 'batches', 'update')
  const canDelete = hasAdminGrant(access, 'batches', 'delete')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [batches, setBatches] = useState<CourseBatchRow[]>([])
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [status, setStatus] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CourseBatchRow | null>(null)
  const [form, setForm] = useState<BatchFormState>({ ...EMPTY_BATCH_FORM, centerId })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [faculty, setFaculty] = useState<FacultyOption[]>([])
  const [pricingBatches, setPricingBatches] = useState<PricingBatchOption[]>([])

  const loadOptions = useCallback(async () => {
    try {
      const res = await authenticatedFetch(`/api/admin/batches/options?centerId=${centerId}`, {
        headers: authHeaders(),
      })
      if (!res.ok) return
      const data = await res.json()
      setCourses(data.courses || [])
      setFaculty(data.employees || [])
      setPricingBatches(data.pricingBatches || [])
    } catch {
      /* ignore */
    }
  }, [centerId])

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

      const res = await authenticatedFetch(`/api/admin/batches?${qs}`, {
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      setBatches(data.batches || [])
      setPageInfo(data.pagination || null)
    } catch (err) {
      setError(err)
      setBatches([])
      setPageInfo(null)
    } finally {
      setLoading(false)
    }
  }, [centerId, page, search, status])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_BATCH_FORM, centerId })
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (row: CourseBatchRow) => {
    setEditing(row)
    setForm({
      ...EMPTY_BATCH_FORM,
      centerId,
      courseMasterId: String(row.course_master_id),
      name: row.name,
      code: row.code || '',
      startDate: row.start_date ? String(row.start_date).slice(0, 10) : '',
      endDate: row.end_date ? String(row.end_date).slice(0, 10) : '',
      status: row.status,
      capacity: row.capacity != null ? String(row.capacity) : '',
      facultyEmployeeId: row.faculty_employee_id != null ? String(row.faculty_employee_id) : '',
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
        editing ? `/api/admin/batches/${editing.id}` : '/api/admin/batches',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Failed to save batch')
        return
      }
      toast.success(editing ? 'Batch updated' : 'Batch created')
      setModalOpen(false)
      void load()
    } catch {
      setFormError('Failed to save batch')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: CourseBatchRow) => {
    const ok = await confirmDialog({
      title: 'Delete batch',
      message: `Delete ${row.name}? Enrollments and attendance for this batch will also be removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return

    const res = await authenticatedFetch(
      `/api/admin/batches/${row.id}?centerId=${centerId}`,
      { method: 'DELETE', headers: authHeaders() }
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Delete failed')
      return
    }
    toast.success('Batch deleted')
    void load()
  }

  const columns: AdminTableColumn<CourseBatchRow>[] = [
    {
      key: 'code',
      header: 'Code',
      sortValue: (r) => r.code,
      cellClassName: 'font-mono text-xs',
      render: (r) => r.code || '—',
    },
    {
      key: 'name',
      header: 'Batch',
      sortValue: (r) => r.name,
      render: (r) => (
        <Link
          href={`/admin/${centerId}/batches/${r.id}`}
          className="font-medium text-primary hover:underline"
        >
          {r.name}
        </Link>
      ),
    },
    {
      key: 'course_title',
      header: 'Course',
      hideOnMobile: true,
      render: (r) => r.course_title || '—',
    },
    {
      key: 'faculty_name',
      header: 'Faculty',
      hideOnMobile: true,
      render: (r) => r.faculty_name || '—',
    },
    {
      key: 'dates',
      header: 'Dates',
      hideOnMobile: true,
      render: (r) => `${formatDate(r.start_date)} – ${formatDate(r.end_date)}`,
    },
    {
      key: 'enrolled_count',
      header: 'Enrolled',
      render: (r) =>
        r.capacity != null ? `${r.enrolled_count ?? 0}/${r.capacity}` : String(r.enrolled_count ?? 0),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      render: (r) => (
        <span className={statusBadgeClass(r.status)}>{batchStatusLabel(r.status)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {canEdit ? (
            <AdminButton type="button" variant="ghost" size="sm" onClick={() => openEdit(r)}>
              Edit
            </AdminButton>
          ) : null}
          {canDelete ? (
            <AdminButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleDelete(r)}
            >
              Delete
            </AdminButton>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <AdminPageShell>
      <PageHeader
        title="Batches"
        description="Academic class cohorts for this center (separate from course fee/pricing batches)."
        breadcrumbs={[
          { label: 'Dashboard', href: `/admin/${centerId}/dashboard` },
          { label: 'Batches' },
        ]}
        actions={
          canCreate ? (
            <AdminButton type="button" onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
              New batch
            </AdminButton>
          ) : null
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cm-color-text-muted)]" />
          <Input
            className="pl-9"
            placeholder="Search name, code, course…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1)
                setSearch(searchDraft)
              }
            }}
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
          className="sm:w-40"
        >
          <option value="">All statuses</option>
          {BATCH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {batchStatusLabel(s)}
            </option>
          ))}
        </Select>
        <AdminButton
          type="button"
          variant="secondary"
          onClick={() => {
            setPage(1)
            setSearch(searchDraft)
          }}
        >
          Search
        </AdminButton>
      </div>

      <AdminDataTable
        columns={columns}
        rows={batches}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={() => void load()}
        emptyMessage="No batches yet. Create a class batch to enroll students and mark attendance."
        emptyIcon={<Layers className="h-12 w-12" />}
      />

      {pageInfo ? (
        <div className="mt-4">
          <Pagination
            currentPage={page}
            totalPages={pageInfo.totalPages}
            totalItems={pageInfo.total}
            itemsPerPage={PAGE_SIZE}
            startIndex={(page - 1) * PAGE_SIZE}
            endIndex={(page - 1) * PAGE_SIZE + batches.length}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit batch' : 'Create batch'}
        description="Class cohort for operations and attendance — not a fee pricing batch."
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
            submitLabel={editing ? 'Save changes' : 'Create batch'}
            isSubmitting={saving}
          />
        </form>
      </FormModal>
    </AdminPageShell>
  )
}
