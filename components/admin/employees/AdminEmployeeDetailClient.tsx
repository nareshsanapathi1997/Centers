'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, IdCard, Pencil, Trash2 } from 'lucide-react'
import { authenticatedFetch } from '@/lib/admin-api'
import { toast, confirmDialog } from '@/lib/admin-ui-store'
import { useAdminPermissions, hasAdminGrant } from '@/lib/use-admin-permissions'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminButton from '@/components/admin/AdminButton'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import AdminErrorState from '@/components/admin/AdminErrorState'
import type { EmployeeRow } from '@/lib/employees-types'
import EmployeeFormFields, {
  EMPTY_EMPLOYEE_FORM,
  employeeStatusLabel,
  employmentTypeLabel,
  employeeToForm,
  formToPayload,
  statusBadgeClass,
  type EmployeeFormState,
} from '@/components/admin/employees/EmployeeFormFields'

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

export default function AdminEmployeeDetailClient({
  centerId,
  employeeId,
}: {
  centerId: string
  employeeId: string
}) {
  const { access } = useAdminPermissions(centerId)
  const canEdit = hasAdminGrant(access, 'employees', 'update')
  const canDelete = hasAdminGrant(access, 'employees', 'delete')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [employee, setEmployee] = useState<EmployeeRow | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<EmployeeFormState>({ ...EMPTY_EMPLOYEE_FORM, centerId })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [adminOptions, setAdminOptions] = useState<
    Array<{ id: number; username: string; full_name?: string | null }>
  >([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authenticatedFetch(
        `/api/admin/employees/${employeeId}?centerId=${centerId}`,
        { headers: authHeaders() }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      setEmployee(data.employee)
    } catch (err) {
      setError(err)
      setEmployee(null)
    } finally {
      setLoading(false)
    }
  }, [centerId, employeeId])

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

  const openEdit = () => {
    if (!employee) return
    setForm(employeeToForm(employee as unknown as Record<string, unknown>, centerId))
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const res = await authenticatedFetch(`/api/admin/employees/${employeeId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(formToPayload({ ...form, centerId })),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error || 'Failed to update')
        return
      }
      toast.success('Employee updated')
      setModalOpen(false)
      setEmployee(data.employee)
    } catch {
      setFormError('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!employee) return
    const ok = await confirmDialog({
      title: 'Delete employee',
      message: `Delete ${employee.full_name}? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return

    const res = await authenticatedFetch(
      `/api/admin/employees/${employeeId}?centerId=${centerId}`,
      { method: 'DELETE', headers: authHeaders() }
    )
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Delete failed')
      return
    }
    toast.success('Employee deleted')
    window.location.href = `/admin/${centerId}/employees`
  }

  if (loading) {
    return (
      <AdminPageShell>
        <LoadingSkeleton variant="cards" rows={4} />
      </AdminPageShell>
    )
  }

  if (error || !employee) {
    return (
      <AdminPageShell>
        <AdminErrorState
          error={error || new Error('Employee not found')}
          onRetry={() => void load()}
        />
        <div className="mt-4">
          <Link href={`/admin/${centerId}/employees`} className="text-sm text-primary hover:underline">
            Back to employees
          </Link>
        </div>
      </AdminPageShell>
    )
  }

  const docs = Array.isArray(employee.documents) ? employee.documents : []

  return (
    <AdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <IdCard className="h-7 w-7" />
              {employee.full_name}
            </span>
          }
          description={
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs">{employee.employee_code || 'No code'}</span>
              <span className={statusBadgeClass(employee.status)}>
                {employeeStatusLabel(employee.status)}
              </span>
            </span>
          }
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${centerId}/dashboard` },
            { label: 'Employees', href: `/admin/${centerId}/employees` },
            { label: employee.full_name },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href={`/admin/${centerId}/employees`}>
                <AdminButton variant="secondary" size="sm" icon={<ArrowLeft />}>
                  Back
                </AdminButton>
              </Link>
              {canEdit ? (
                <AdminButton variant="primary" size="sm" icon={<Pencil />} onClick={openEdit}>
                  Edit
                </AdminButton>
              ) : null}
              {canDelete ? (
                <AdminButton
                  variant="danger"
                  size="sm"
                  icon={<Trash2 />}
                  onClick={() => void handleDelete()}
                >
                  Delete
                </AdminButton>
              ) : null}
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="admin-card space-y-4 p-5">
            <h2 className="text-base font-semibold text-[var(--cm-color-text)]">Personal info</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem label="Email" value={employee.email} />
              <DetailItem label="Mobile" value={employee.mobile} />
              <DetailItem label="Alternate mobile" value={employee.alternate_mobile} />
              <DetailItem label="Date of birth" value={formatDate(employee.date_of_birth)} />
              <DetailItem label="Gender" value={employee.gender} />
              <DetailItem
                label="Address"
                value={[employee.address, employee.city, employee.state, employee.pincode]
                  .filter(Boolean)
                  .join(', ')}
              />
              <DetailItem label="Emergency contact" value={employee.emergency_contact_name} />
              <DetailItem label="Emergency phone" value={employee.emergency_contact_phone} />
            </dl>
          </section>

          <section className="admin-card space-y-4 p-5">
            <h2 className="text-base font-semibold text-[var(--cm-color-text)]">Employment</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem label="Job title" value={employee.job_title} />
              <DetailItem label="Department" value={employee.department} />
              <DetailItem
                label="Employment type"
                value={employmentTypeLabel(employee.employment_type)}
              />
              <DetailItem label="Status" value={employeeStatusLabel(employee.status)} />
              <DetailItem label="Join date" value={formatDate(employee.join_date)} />
              <DetailItem label="End date" value={formatDate(employee.end_date)} />
              <DetailItem label="Center" value={employee.center_name || 'This center'} />
              <DetailItem
                label="Linked admin"
                value={
                  employee.admin_username
                    ? `${employee.admin_full_name || employee.admin_username} (${employee.admin_username})`
                    : null
                }
              />
            </dl>
          </section>

          <section className="admin-card space-y-4 p-5">
            <h2 className="text-base font-semibold text-[var(--cm-color-text)]">Documents</h2>
            {docs.length === 0 ? (
              <p className="text-sm text-[var(--cm-color-text-muted)]">No documents recorded.</p>
            ) : (
              <ul className="space-y-2">
                {docs.map((doc, index) => (
                  <li key={`${doc.name}-${index}`} className="text-sm">
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {doc.name}
                      </a>
                    ) : (
                      <span>{doc.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-card space-y-4 p-5">
            <h2 className="text-base font-semibold text-[var(--cm-color-text)]">Activity</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem label="Created" value={formatDate(employee.created_at)} />
              <DetailItem label="Updated" value={formatDate(employee.updated_at)} />
            </dl>
            {employee.notes ? (
              <p className="whitespace-pre-wrap text-sm text-[var(--cm-color-text-muted)]">
                {employee.notes}
              </p>
            ) : (
              <p className="text-sm text-[var(--cm-color-text-muted)]">
                No notes yet. Expense and attendance history will appear here in later modules.
              </p>
            )}
          </section>
        </div>
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit employee"
        size="xlarge"
        formError={formError}
        footer={
          <FormModalActions
            formId="admin-employee-detail-form"
            onCancel={() => setModalOpen(false)}
            submitLabel="Save changes"
            isSubmitting={saving}
          />
        }
      >
        <form id="admin-employee-detail-form" onSubmit={handleSave}>
          <EmployeeFormFields form={form} onChange={setForm} adminOptions={adminOptions} />
        </form>
      </FormModal>
    </AdminPageShell>
  )
}
