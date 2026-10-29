'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { IdCard, Plus, Search } from 'lucide-react'
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
import { EMPLOYEE_STATUSES, type EmployeeRow } from '@/lib/employees-types'
import EmployeeFormFields, {
  EMPTY_EMPLOYEE_FORM,
  employeeStatusLabel,
  employmentTypeLabel,
  formToPayload,
  statusBadgeClass,
  type EmployeeFormState,
} from '@/components/admin/employees/EmployeeFormFields'

type PageInfo = { page: number; pageSize: number; total: number; totalPages: number }
type CenterOption = { id: number; name: string }

const PAGE_SIZE = 25

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

export default function SuperAdminEmployeesPageClient() {
  const { access } = useSuperAdminPermissions()
  const canCreate = hasGrant(access, 'employees', 'create')
  const canEdit = hasGrant(access, 'employees', 'update')
  const canDelete = hasGrant(access, 'employees', 'delete')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [employees, setEmployees] = useState<(EmployeeRow & { center_name?: string })[]>([])
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [status, setStatus] = useState('')
  const [centerId, setCenterId] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EmployeeRow | null>(null)
  const [form, setForm] = useState<EmployeeFormState>({ ...EMPTY_EMPLOYEE_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

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

      const res = await superAdminFetch(`/api/super-admin/employees?${qs}`, {
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      setEmployees(data.employees || [])
      setPageInfo(data.pagination || null)
    } catch (err) {
      setError(err)
      setEmployees([])
      setPageInfo(null)
    } finally {
      setLoading(false)
    }
  }, [page, search, status, centerId])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_EMPLOYEE_FORM, centerId: centerId || '' })
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (row: EmployeeRow) => {
    setEditing(row)
    setForm({
      ...EMPTY_EMPLOYEE_FORM,
      centerId: String(row.center_id),
      employeeCode: row.employee_code || '',
      fullName: row.full_name,
      email: row.email || '',
      mobile: row.mobile || '',
      alternateMobile: row.alternate_mobile || '',
      jobTitle: row.job_title || '',
      department: row.department || '',
      employmentType: row.employment_type,
      status: row.status,
      joinDate: row.join_date ? String(row.join_date).slice(0, 10) : '',
      endDate: row.end_date ? String(row.end_date).slice(0, 10) : '',
      dateOfBirth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : '',
      gender: row.gender || '',
      address: row.address || '',
      city: row.city || '',
      state: row.state || '',
      pincode: row.pincode || '',
      emergencyContactName: row.emergency_contact_name || '',
      emergencyContactPhone: row.emergency_contact_phone || '',
      adminUserId: row.admin_user_id != null ? String(row.admin_user_id) : '',
      documentsText: (Array.isArray(row.documents) ? row.documents : [])
        .map((d) => [d.name, d.url].filter(Boolean).join('|'))
        .join('\n'),
      notes: row.notes || '',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.centerId) {
      setFormError('Center is required')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload = formToPayload(form)
      const res = await superAdminFetch(
        editing ? `/api/super-admin/employees/${editing.id}` : '/api/super-admin/employees',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Failed to save employee')
        return
      }
      toast.success(editing ? 'Employee updated' : 'Employee created')
      setModalOpen(false)
      void load()
    } catch {
      setFormError('Failed to save employee')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: EmployeeRow) => {
    const ok = await confirmDialog({
      title: 'Delete employee',
      message: `Delete ${row.full_name}? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return

    const res = await superAdminFetch(`/api/super-admin/employees/${row.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Delete failed')
      return
    }
    toast.success('Employee deleted')
    void load()
  }

  const columns: AdminTableColumn<EmployeeRow & { center_name?: string }>[] = [
    {
      key: 'center_name',
      header: 'Center',
      sortValue: (r) => r.center_name,
      render: (r) => r.center_name || '—',
    },
    {
      key: 'employee_code',
      header: 'Code',
      cellClassName: 'font-mono text-xs',
      render: (r) => r.employee_code || '—',
    },
    {
      key: 'full_name',
      header: 'Name',
      sortValue: (r) => r.full_name,
      render: (r) => (
        <Link
          href={`/super-admin/employees/${r.id}`}
          className="font-medium text-primary hover:underline"
        >
          {r.full_name}
        </Link>
      ),
    },
    {
      key: 'job_title',
      header: 'Title',
      hideOnMobile: true,
      render: (r) => r.job_title || '—',
    },
    {
      key: 'mobile',
      header: 'Mobile',
      hideOnMobile: true,
      render: (r) => r.mobile || '—',
    },
    {
      key: 'employment_type',
      header: 'Type',
      hideOnMobile: true,
      render: (r) => employmentTypeLabel(r.employment_type),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span className={statusBadgeClass(r.status)}>{employeeStatusLabel(r.status)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          <Link href={`/super-admin/employees/${r.id}`} className="text-sm text-primary hover:underline">
            View
          </Link>
          <Link
            href={`/admin/${r.center_id}/employees`}
            className="text-sm text-primary hover:underline"
          >
            Center
          </Link>
          {canEdit ? (
            <button type="button" className="text-sm text-primary hover:underline" onClick={() => openEdit(r)}>
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

  const total = pageInfo?.total ?? 0
  const totalPages = pageInfo?.totalPages ?? 1
  const startIndex = ((pageInfo?.page || page) - 1) * PAGE_SIZE
  const endIndex = startIndex + employees.length

  return (
    <SuperAdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <IdCard className="h-7 w-7" />
              Employees (All Centers)
            </span>
          }
          description="Cross-center employee directory for HR and expense workflows."
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Employees' },
          ]}
          actions={
            canCreate ? (
              <AdminButton variant="primary" size="sm" icon={<Plus />} onClick={openCreate}>
                Add employee
              </AdminButton>
            ) : null
          }
        />

        <div className="flex flex-col gap-3 lg:flex-row">
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
              placeholder="Search name, code, mobile, center…"
              className="admin-form-control pl-9"
              aria-label="Search employees"
            />
          </div>
          <Select
            value={centerId}
            onChange={(e) => {
              setPage(1)
              setCenterId(e.target.value)
            }}
            className="max-w-xs admin-form-control"
            aria-label="Filter by center"
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
            className="max-w-xs admin-form-control"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {EMPLOYEE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {employeeStatusLabel(s)}
              </option>
            ))}
          </Select>
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
            rows={employees}
            rowKey={(r) => r.id}
            loading={loading}
            error={error}
            onRetry={() => void load()}
            caption="Employees across centers"
            emptyMessage="No employees found."
            emptyIcon={<IdCard className="h-12 w-12" />}
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
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit employee' : 'Add employee'}
        description="Create or update a staff record for any center."
        size="xlarge"
        formError={formError}
        footer={
          <FormModalActions
            formId="sa-employee-form"
            onCancel={() => setModalOpen(false)}
            submitLabel={editing ? 'Save changes' : 'Create employee'}
            isSubmitting={saving}
          />
        }
      >
        <form id="sa-employee-form" onSubmit={handleSave}>
          <EmployeeFormFields
            form={form}
            onChange={setForm}
            centers={centers}
            showCenterSelect={!editing}
          />
        </form>
      </FormModal>
    </SuperAdminPageShell>
  )
}
