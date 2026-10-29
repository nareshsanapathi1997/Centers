'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { IdCard, Plus, Search } from 'lucide-react'
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

const PAGE_SIZE = 25

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

export default function AdminEmployeesPageClient({ centerId }: { centerId: string }) {
  const { access } = useAdminPermissions(centerId)
  const canCreate = hasAdminGrant(access, 'employees', 'create')
  const canEdit = hasAdminGrant(access, 'employees', 'update')
  const canDelete = hasAdminGrant(access, 'employees', 'delete')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [searchDraft, setSearchDraft] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EmployeeRow | null>(null)
  const [form, setForm] = useState<EmployeeFormState>({
    ...EMPTY_EMPLOYEE_FORM,
    centerId,
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [adminOptions, setAdminOptions] = useState<
    Array<{ id: number; username: string; full_name?: string | null }>
  >([])

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

      const res = await authenticatedFetch(`/api/admin/employees?${qs}`, {
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
  }, [centerId, page, search, status])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    authenticatedFetch(`/api/admin/center-admins?centerId=${centerId}`, {
      headers: authHeaders(),
    })
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        const rows = Array.isArray(data) ? data : data.admins || data.centerAdmins || []
        setAdminOptions(
          rows.map((row: { id: number; username: string; full_name?: string | null }) => ({
            id: row.id,
            username: row.username,
            full_name: row.full_name,
          }))
        )
      })
      .catch(() => {})
  }, [centerId])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_EMPLOYEE_FORM, centerId })
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (row: EmployeeRow) => {
    setEditing(row)
    setForm({
      ...EMPTY_EMPLOYEE_FORM,
      centerId,
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
    setSaving(true)
    setFormError('')
    try {
      const payload = formToPayload({ ...form, centerId })
      const res = await authenticatedFetch(
        editing ? `/api/admin/employees/${editing.id}` : '/api/admin/employees',
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

    const res = await authenticatedFetch(
      `/api/admin/employees/${row.id}?centerId=${centerId}`,
      { method: 'DELETE', headers: authHeaders() }
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Delete failed')
      return
    }
    toast.success('Employee deleted')
    void load()
  }

  const columns: AdminTableColumn<EmployeeRow>[] = [
    {
      key: 'employee_code',
      header: 'Code',
      sortValue: (r) => r.employee_code,
      cellClassName: 'font-mono text-xs',
      render: (r) => r.employee_code || '—',
    },
    {
      key: 'full_name',
      header: 'Name',
      sortValue: (r) => r.full_name,
      render: (r) => (
        <Link
          href={`/admin/${centerId}/employees/${r.id}`}
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
      sortValue: (r) => r.status,
      render: (r) => (
        <span className={statusBadgeClass(r.status)}>{employeeStatusLabel(r.status)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/${centerId}/employees/${r.id}`}
            className="text-sm text-primary hover:underline"
          >
            View
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
    <AdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <IdCard className="h-7 w-7" />
              Employees
            </span>
          }
          description="Manage center staff records for payroll, expenses, and operations."
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${centerId}/dashboard` },
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

        <div className="flex flex-col gap-3 sm:flex-row">
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
              placeholder="Search name, code, mobile, title…"
              className="admin-form-control pl-9"
              aria-label="Search employees"
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
            caption="Center employees"
            emptyMessage="No employees yet. Add the first staff member to get started."
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
        description="Personal and employment details for this center."
        size="xlarge"
        formError={formError}
        footer={
          <FormModalActions
            formId="admin-employee-form"
            onCancel={() => setModalOpen(false)}
            submitLabel={editing ? 'Save changes' : 'Create employee'}
            isSubmitting={saving}
          />
        }
      >
        <form id="admin-employee-form" onSubmit={handleSave}>
          <EmployeeFormFields
            form={form}
            onChange={setForm}
            adminOptions={adminOptions}
            formId="admin-employee-fields"
          />
        </form>
      </FormModal>
    </AdminPageShell>
  )
}
