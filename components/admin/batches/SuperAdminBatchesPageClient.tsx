'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Layers, Plus, Search } from 'lucide-react'
import { superAdminFetch } from '@/lib/super-admin-api'
import { toast, confirmDialog } from '@/lib/admin-ui-store'
import { useSuperAdminPermissions, hasGrant } from '@/lib/use-super-admin-permissions'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
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
type CenterOption = { id: number; name: string }

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

export default function SuperAdminBatchesPageClient() {
  const { access } = useSuperAdminPermissions()
  const canCreate = hasGrant(access, 'batches', 'create')
  const canEdit = hasGrant(access, 'batches', 'update')
  const canDelete = hasGrant(access, 'batches', 'delete')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [batches, setBatches] = useState<(CourseBatchRow & { center_name?: string })[]>([])
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [status, setStatus] = useState('')
  const [centerId, setCenterId] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CourseBatchRow | null>(null)
  const [form, setForm] = useState<BatchFormState>({ ...EMPTY_BATCH_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [faculty, setFaculty] = useState<FacultyOption[]>([])
  const [pricingBatches, setPricingBatches] = useState<PricingBatchOption[]>([])

  const centersQuery = useQuery({
    queryKey: ['super-admin', 'centers-options'],
    queryFn: async (): Promise<CenterOption[]> => {
      const res = await superAdminFetch('/api/public/centers')
      const data = await res.json()
      return data.centers || []
    },
    staleTime: 60_000,
  })
  const centers = centersQuery.data ?? []

  const loadOptions = useCallback(async (cid: string) => {
    if (!cid) {
      setCourses([])
      setFaculty([])
      setPricingBatches([])
      return
    }
    try {
      const res = await superAdminFetch(`/api/super-admin/batches/options?centerId=${cid}`, {
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
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      })
      if (search.trim()) qs.set('search', search.trim())
      if (status) qs.set('status', status)
      if (centerId) qs.set('centerId', centerId)

      const res = await superAdminFetch(`/api/super-admin/batches?${qs}`, {
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
  }, [page, search, status, centerId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (form.centerId) void loadOptions(form.centerId)
  }, [form.centerId, loadOptions])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_BATCH_FORM, centerId: centerId || '' })
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (row: CourseBatchRow) => {
    setEditing(row)
    setForm({
      ...EMPTY_BATCH_FORM,
      centerId: String(row.center_id),
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
      const payload = formToPayload(form)
      const res = await superAdminFetch(
        editing ? `/api/super-admin/batches/${editing.id}` : '/api/super-admin/batches',
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
      message: `Delete ${row.name}? Enrollments and attendance will also be removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return

    const res = await superAdminFetch(`/api/super-admin/batches/${row.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Delete failed')
      return
    }
    toast.success('Batch deleted')
    void load()
  }

  const columns: AdminTableColumn<CourseBatchRow & { center_name?: string }>[] = [
    {
      key: 'center_name',
      header: 'Center',
      hideOnMobile: true,
      render: (r) => r.center_name || '—',
    },
    {
      key: 'code',
      header: 'Code',
      cellClassName: 'font-mono text-xs',
      render: (r) => r.code || '—',
    },
    {
      key: 'name',
      header: 'Batch',
      render: (r) => (
        <Link
          href={`/super-admin/batches/${r.id}`}
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
    <SuperAdminPageShell>
      <PageHeader
        title="Batches"
        description="Cross-center academic class cohorts (distinct from course fee/pricing batches)."
        breadcrumbs={[{ label: 'Batches' }]}
        actions={
          canCreate ? (
            <AdminButton type="button" onClick={openCreate} icon={<Plus className="h-4 w-4" />}>
              New batch
            </AdminButton>
          ) : null
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cm-color-text-muted)]" />
          <Input
            className="pl-9"
            placeholder="Search batch, course, center…"
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
          value={centerId}
          onChange={(e) => {
            setPage(1)
            setCenterId(e.target.value)
          }}
          className="lg:w-56"
        >
          <option value="">All centers</option>
          {centers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
          className="lg:w-40"
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
        emptyMessage="No batches found across centers."
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
      >
        <form onSubmit={handleSave} className="space-y-4">
          <BatchFormFields
            form={form}
            onChange={setForm}
            courses={courses}
            faculty={faculty}
            pricingBatches={pricingBatches}
            showCenterSelect
            centers={centers}
            lockCenter={Boolean(editing)}
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
    </SuperAdminPageShell>
  )
}
