'use client'

import { authenticatedFetch } from '@/lib/admin-api'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { withBasePath } from '@/lib/with-base-path'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import AdminButton from '@/components/admin/AdminButton'
import AdminFormField from '@/components/admin/AdminFormField'
import FormModal from '@/components/admin/FormModal'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import { Input } from '@/components/forms'
import {
  ExternalLink,
  GraduationCap,
  KeyRound,
  Plus,
  Receipt,
  UserCheck,
  UserX,
  Download,
  Activity,
} from 'lucide-react'
import Link from 'next/link'
import { PASSWORD_POLICY_HINT } from '@/lib/password-policy'

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

const EMPTY_FORM = {
  fullName: '',
  email: '',
  mobile: '',
  password: '',
  fatherName: '',
}

type StudentRow = {
  id: number
  regno: string
  full_name: string
  mobile: string
  email?: string | null
  payment_count?: number
  is_active: boolean
}

export default function AdminStudentsPageClient({ centerId }: { centerId: string }) {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') || ''

  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [search, setSearch] = useState(initialSearch)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [centerSlug, setCenterSlug] = useState('')
  const [resetStudent, setResetStudent] = useState<StudentRow | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [paymentsStudent, setPaymentsStudent] = useState<StudentRow | null>(null)
  const [studentPayments, setStudentPayments] = useState<any[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch)
  }, [initialSearch])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ centerId })
      if (search.trim()) qs.set('search', search.trim())
      const res = await authenticatedFetch(`/api/admin/students?${qs}`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
      }
    } finally {
      setLoading(false)
    }
  }, [centerId, search])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    authenticatedFetch(`/api/admin/center/${centerId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setCenterSlug(data.slug || ''))
      .catch(() => {})
  }, [centerId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const res = await authenticatedFetch('/api/admin/students', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ centerId: parseInt(centerId, 10), ...form }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to create student')
        return
      }
      setShowForm(false)
      setForm(EMPTY_FORM)
      void load()
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (studentId: number, isActive: boolean) => {
    await authenticatedFetch('/api/admin/students', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ centerId: parseInt(centerId, 10), studentId, isActive: !isActive }),
    })
    void load()
  }

  const exportCsv = () => {
    const qs = new URLSearchParams({ centerId })
    if (search.trim()) qs.set('search', search.trim())
    window.open(withBasePath(`/api/admin/students/export?${qs}`), '_blank')
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetStudent) return
    setSaving(true)
    setFormError('')
    try {
      const res = await authenticatedFetch('/api/admin/students', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          centerId: parseInt(centerId, 10),
          studentId: resetStudent.id,
          newPassword: resetPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to reset password')
        return
      }
      setResetStudent(null)
      setResetPassword('')
    } finally {
      setSaving(false)
    }
  }

  const openPayments = async (student: StudentRow) => {
    setPaymentsStudent(student)
    setPaymentsLoading(true)
    try {
      const res = await authenticatedFetch(
        `/api/admin/students/${student.id}/payments?centerId=${centerId}`,
        { headers: authHeaders() },
      )
      if (res.ok) {
        const data = await res.json()
        setStudentPayments(data.payments || [])
      }
    } finally {
      setPaymentsLoading(false)
    }
  }

  const columns: AdminTableColumn<StudentRow>[] = [
    {
      key: 'regno',
      header: 'Reg No',
      sortValue: (s) => s.regno,
      cellClassName: 'font-mono text-xs',
      render: (s) => s.regno,
    },
    {
      key: 'full_name',
      header: 'Name',
      sortValue: (s) => s.full_name,
      render: (s) => s.full_name,
    },
    {
      key: 'mobile',
      header: 'Mobile',
      hideOnMobile: true,
      render: (s) => s.mobile,
    },
    {
      key: 'email',
      header: 'Email',
      hideOnMobile: true,
      render: (s) => s.email || '—',
    },
    {
      key: 'payment_count',
      header: 'Payments',
      hideOnMobile: true,
      align: 'right',
      sortValue: (s) => Number(s.payment_count ?? 0),
      render: (s) => s.payment_count ?? 0,
    },
    {
      key: 'is_active',
      header: 'Status',
      sortValue: (s) => (s.is_active ? 1 : 0),
      render: (s) => (
        <span className={`admin-badge ${s.is_active ? 'admin-badge-success' : 'admin-badge-danger'}`}>
          {s.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (s) => (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void openPayments(s)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <Receipt className="h-3.5 w-3.5" /> Payments
          </button>
          <button
            type="button"
            onClick={() => {
              setResetStudent(s)
              setResetPassword('')
              setFormError('')
            }}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <KeyRound className="h-3.5 w-3.5" /> Reset pwd
          </button>
          <button
            type="button"
            onClick={() => void toggleActive(s.id, s.is_active)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {s.is_active ? (
              <>
                <UserX className="h-4 w-4" /> Deactivate
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4" /> Activate
              </>
            )}
          </button>
          {centerSlug ? (
            <a
              href={`/${centerSlug}/student/login`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Portal
            </a>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <AdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <GraduationCap className="h-7 w-7" />
              Student Portal Accounts
            </span>
          }
          description="Manage student login accounts for your center portal."
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${centerId}` },
            { label: 'Students' },
          ]}
          actions={
            <>
              {centerSlug ? (
                <a
                  href={`/${centerSlug}/student/login`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-btn admin-btn--sm admin-btn--secondary"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Portal
                </a>
              ) : null}
              <AdminButton type="button" variant="secondary" onClick={exportCsv} icon={<Download className="h-4 w-4" />}>
                Export CSV
              </AdminButton>
              <Link href={`/admin/${centerId}/activity-logs?userType=student`} className="admin-btn admin-btn--sm">
                <Activity className="h-4 w-4" />
                Student Activity
              </Link>
              <AdminButton onClick={() => setShowForm(true)} icon={<Plus className="h-4 w-4" />}>
                Add Student
              </AdminButton>
            </>
          }
        />

        <div className="max-w-md">
          <Input
            type="search"
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search students"
          />
        </div>

        <div className="admin-card overflow-hidden">
          <AdminDataTable
            columns={columns}
            rows={students}
            rowKey={(s) => s.id}
            loading={loading}
            caption="Student portal accounts"
            emptyMessage="No student accounts yet."
            emptyIcon={<GraduationCap className="h-12 w-12" />}
          />
        </div>

        <FormModal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false)
            setFormError('')
          }}
          title="Create Student Account"
          formError={formError || undefined}
          footer={
            <div className="admin-btn-group admin-btn-group--end">
              <AdminButton type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </AdminButton>
              <AdminButton type="submit" form="create-student-form" variant="primary" size="sm" disabled={saving}>
                {saving ? 'Saving…' : 'Create Account'}
              </AdminButton>
            </div>
          }
        >
          <form id="create-student-form" onSubmit={handleCreate} className="admin-form space-y-4">
            <AdminFormField label="Full Name *" required>
              <input
                className="admin-form-control"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </AdminFormField>
            <AdminFormField label="Mobile *" required>
              <input
                className="admin-form-control"
                type="tel"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                required
              />
            </AdminFormField>
            <AdminFormField label="Email">
              <input
                className="admin-form-control"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </AdminFormField>
            <AdminFormField label="Father's Name">
              <input
                className="admin-form-control"
                value={form.fatherName}
                onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
              />
            </AdminFormField>
            <AdminFormField label="Initial Password *" required hint={PASSWORD_POLICY_HINT}>
              <input
                className="admin-form-control"
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </AdminFormField>
          </form>
        </FormModal>

        <FormModal
          isOpen={Boolean(resetStudent)}
          onClose={() => {
            setResetStudent(null)
            setResetPassword('')
            setFormError('')
          }}
          title={`Reset password — ${resetStudent?.full_name || ''}`}
          formError={formError || undefined}
          footer={
            <div className="admin-btn-group admin-btn-group--end">
              <AdminButton type="button" variant="secondary" size="sm" onClick={() => setResetStudent(null)}>
                Cancel
              </AdminButton>
              <AdminButton type="submit" form="reset-student-form" variant="primary" size="sm" disabled={saving}>
                {saving ? 'Saving…' : 'Reset Password'}
              </AdminButton>
            </div>
          }
        >
          <form id="reset-student-form" onSubmit={handleResetPassword} className="admin-form space-y-4">
            <AdminFormField label="New Password *" required hint={PASSWORD_POLICY_HINT}>
              <input
                className="admin-form-control"
                type="password"
                minLength={8}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                required
              />
            </AdminFormField>
          </form>
        </FormModal>

        <FormModal
          isOpen={Boolean(paymentsStudent)}
          onClose={() => {
            setPaymentsStudent(null)
            setStudentPayments([])
          }}
          title={`Payments — ${paymentsStudent?.full_name || ''}`}
          footer={
            <AdminButton type="button" variant="secondary" size="sm" onClick={() => setPaymentsStudent(null)}>
              Close
            </AdminButton>
          }
        >
          {paymentsLoading ? (
            <LoadingSkeleton variant="line" rows={4} />
          ) : studentPayments.length === 0 ? (
            <p className="text-sm text-[var(--cm-color-text-muted)]">No linked payments.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {studentPayments.map((p) => (
                <div key={p.id} className="border-b border-[var(--cm-color-border)] pb-2 text-sm">
                  <p className="font-medium">
                    {p.course_title || 'Course'} — {p.receipt_no}
                  </p>
                  <p className="text-[var(--cm-color-text-muted)]">
                    ₹{Number(p.amount_paid).toLocaleString('en-IN')} · {p.status} ·{' '}
                    {new Date(p.created_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </FormModal>
      </div>
    </AdminPageShell>
  )
}
