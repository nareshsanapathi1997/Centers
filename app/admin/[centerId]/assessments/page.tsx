'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { authenticatedFetch } from '@/lib/admin-api'
import { withBasePath } from '@/lib/with-base-path'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import AdminButton from '@/components/admin/AdminButton'
import AdminFormField from '@/components/admin/AdminFormField'
import FormModal from '@/components/admin/FormModal'
import PageHeader from '@/components/ui/PageHeader'
import type { CenterCoursePricingRow } from '@/lib/course-fees-db'
import { ClipboardList, Plus, Trash2, Pencil, Eye } from 'lucide-react'
import { confirmDialog } from '@/lib/admin-ui-store'

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

const EMPTY_FORM = {
  courseMasterId: '',
  mode: 'practice',
  title: '',
  description: '',
  durationMinutes: '60',
  maxAttempts: '3',
  startsAt: '',
  endsAt: '',
  shuffleQuestions: false,
  shuffleOptions: false,
  showResults: 'immediate',
  isPublished: false,
  isFree: false,
  marksCorrect: '1',
  marksIncorrect: '0',
}

const MODE_LABELS: Record<string, string> = {
  practice: 'Practice',
  mock: 'Mock test',
  live: 'Live exam',
}

export default function AssessmentsPage({ params }: { params: { centerId: string } }) {
  const centerId = params.centerId
  const [loading, setLoading] = useState(true)
  const [assessments, setAssessments] = useState<any[]>([])
  const [courses, setCourses] = useState<CenterCoursePricingRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, coursesRes] = await Promise.all([
        authenticatedFetch(`/api/admin/assessments?centerId=${centerId}`, { headers: authHeaders() }),
        authenticatedFetch(`/api/admin/course-fees?centerId=${centerId}`, { headers: authHeaders() }),
      ])
      if (aRes.ok) {
        const data = await aRes.json()
        setAssessments(data.assessments || [])
      }
      if (coursesRes.ok) {
        const data = await coursesRes.json()
        setCourses(Array.isArray(data.courses) ? data.courses : [])
      }
    } finally {
      setLoading(false)
    }
  }, [centerId])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  const handleCreate = async () => {
    setFormError('')
    setSaving(true)
    try {
      const res = await authenticatedFetch('/api/admin/assessments', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          centerId: parseInt(centerId, 10),
          courseMasterId: parseInt(form.courseMasterId, 10),
          mode: form.mode,
          title: form.title,
          description: form.description,
          durationMinutes: parseInt(form.durationMinutes, 10) || 60,
          maxAttempts: parseInt(form.maxAttempts, 10) || 1,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
          shuffleQuestions: form.shuffleQuestions,
          shuffleOptions: form.shuffleOptions,
          showResults: form.showResults,
          isPublished: form.isPublished,
          isFree: form.isFree,
          marksCorrect: Number(form.marksCorrect) || 1,
          marksIncorrect: Number(form.marksIncorrect) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to create')
        return
      }
      setShowForm(false)
      window.location.href = withBasePath(`/admin/${centerId}/assessments/${data.assessment.id}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ message: 'Delete this assessment and all attempts?', destructive: true }))) return
    await authenticatedFetch(`/api/admin/assessments/${id}?centerId=${centerId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    load()
  }

  const togglePublished = async (a: any) => {
    await authenticatedFetch(`/api/admin/assessments/${a.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        centerId: parseInt(centerId, 10),
        isPublished: !a.is_published,
      }),
    })
    load()
  }

  const columns: AdminTableColumn<any>[] = [
    {
      key: 'title',
      header: 'Title',
      sortValue: (a) => a.title,
      render: (a) => (
        <Link
          href={`/admin/${centerId}/assessments/${a.id}`}
          className="font-medium text-primary hover:underline"
        >
          {a.title}
        </Link>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      hideOnMobile: true,
      sortValue: (a) => a.course_title || a.course_master_id,
      render: (a) => a.course_title || a.course_master_id,
    },
    {
      key: 'mode',
      header: 'Mode',
      sortValue: (a) => a.mode,
      render: (a) => <span className="admin-badge">{MODE_LABELS[a.mode] || a.mode}</span>,
    },
    {
      key: 'access',
      header: 'Access',
      hideOnMobile: true,
      sortValue: (a) => (a.is_free ? 1 : 0),
      render: (a) => (
        <span className={`admin-badge ${a.is_free ? 'admin-badge-success' : ''}`}>
          {a.is_free ? 'Free' : 'Paid course'}
        </span>
      ),
    },
    {
      key: 'questions',
      header: 'Questions',
      hideOnMobile: true,
      sortValue: (a) => a.question_count ?? 0,
      render: (a) => a.question_count ?? 0,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (a) => (a.is_published ? 1 : 0),
      render: (a) => (
        <button
          type="button"
          onClick={() => void togglePublished(a)}
          className={`admin-badge ${a.is_published ? 'admin-badge-success' : 'admin-badge-danger'}`}
        >
          {a.is_published ? 'Published' : 'Draft'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (a) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/admin/${centerId}/assessments/${a.id}`}
            className="admin-btn admin-btn--icon admin-btn--icon-edit"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <Link
            href={`/admin/${centerId}/assessments/${a.id}?tab=attempts`}
            className="admin-btn admin-btn--icon"
            title="Attempts"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={() => void handleDelete(a.id)}
            className="admin-btn admin-btn--icon admin-btn--icon-danger"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
              <ClipboardList className="h-7 w-7" />
              Quizzes &amp; Exams
            </span>
          }
          description="Practice quizzes, timed mock tests, and scheduled live exams. Mark assessments free for all registered students when needed."
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${centerId}` },
            { label: 'Assessments' },
          ]}
          actions={
            <AdminButton onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
              New Assessment
            </AdminButton>
          }
        />

        <div className="admin-card p-4">
          <AdminDataTable
            columns={columns}
            rows={assessments}
            rowKey={(a) => a.id}
            loading={loading}
            emptyMessage="No assessments yet. Create a practice quiz or live exam."
            caption="Assessments"
          />
        </div>
      </div>

      <FormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Create Assessment"
        formError={formError}
        footer={
          <div className="admin-btn-group admin-btn-group--end admin-modal__footer-actions">
            <AdminButton variant="secondary" onClick={() => setShowForm(false)}>Cancel</AdminButton>
            <AdminButton onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating…' : 'Create & edit'}
            </AdminButton>
          </div>
        }
      >
        <AdminFormField label="Course *" required>
          <select
            className="admin-form-control"
            value={form.courseMasterId}
            onChange={(e) => setForm({ ...form, courseMasterId: e.target.value })}
            required
          >
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.course_master_id} value={String(c.course_master_id)}>
                {c.course_title}
              </option>
            ))}
          </select>
        </AdminFormField>
        <AdminFormField label="Mode *" required>
          <select
            className="admin-form-control"
            value={form.mode}
            onChange={(e) => {
              const mode = e.target.value
              setForm({
                ...form,
                mode,
                maxAttempts: mode === 'practice' ? '3' : '1',
                shuffleQuestions: mode !== 'practice',
                shuffleOptions: mode !== 'practice',
              })
            }}
          >
            <option value="practice">Practice quiz</option>
            <option value="mock">Timed mock test</option>
            <option value="live">Scheduled live exam</option>
          </select>
        </AdminFormField>
        <AdminFormField label="Title *" required>
          <input className="admin-form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </AdminFormField>
        <AdminFormField label="Description">
          <textarea className="admin-form-control" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </AdminFormField>
        <div className="admin-form-row admin-form-row--2">
          <AdminFormField label="Duration (minutes)">
            <input type="number" min={1} className="admin-form-control" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          </AdminFormField>
          <AdminFormField label="Max attempts">
            <input type="number" min={1} className="admin-form-control" value={form.maxAttempts} onChange={(e) => setForm({ ...form, maxAttempts: e.target.value })} />
          </AdminFormField>
        </div>
        {form.mode === 'live' && (
          <div className="admin-form-row admin-form-row--2">
            <AdminFormField label="Starts at *">
              <input type="datetime-local" className="admin-form-control" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </AdminFormField>
            <AdminFormField label="Ends at *">
              <input type="datetime-local" className="admin-form-control" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </AdminFormField>
          </div>
        )}
        <div className="admin-form-row admin-form-row--2">
          <AdminFormField label="Marks (correct)">
            <input type="number" step="0.5" className="admin-form-control" value={form.marksCorrect} onChange={(e) => setForm({ ...form, marksCorrect: e.target.value })} />
          </AdminFormField>
          <AdminFormField label="Marks (incorrect / negative)">
            <input type="number" step="0.25" className="admin-form-control" value={form.marksIncorrect} onChange={(e) => setForm({ ...form, marksIncorrect: e.target.value })} />
          </AdminFormField>
        </div>
        <AdminFormField label="Show results">
          <select className="admin-form-control" value={form.showResults} onChange={(e) => setForm({ ...form, showResults: e.target.value })}>
            <option value="immediate">Immediate</option>
            <option value="after_end">After exam window ends</option>
            <option value="never">Never</option>
          </select>
        </AdminFormField>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.shuffleQuestions} onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })} />
            Shuffle questions
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.shuffleOptions} onChange={(e) => setForm({ ...form, shuffleOptions: e.target.checked })} />
            Shuffle options
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            Publish now
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} />
            Free for all registered students
          </label>
        </div>
      </FormModal>
    </AdminPageShell>
  )
}
