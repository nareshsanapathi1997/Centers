'use client'
import { authenticatedFetch } from '@/lib/admin-api'

import { useCallback, useEffect, useState } from 'react'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import AdminButton from '@/components/admin/AdminButton'
import AdminFormField from '@/components/admin/AdminFormField'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import FileUploadField from '@/components/forms/FileUploadField'
import PageHeader from '@/components/ui/PageHeader'
import type { CenterCoursePricingRow } from '@/lib/course-fees-db'
import { FileText, Plus, Trash2, Pencil } from 'lucide-react'
import { confirmDialog } from '@/lib/admin-ui-store'

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

const EMPTY_FORM = {
  courseMasterId: '',
  title: '',
  description: '',
  fileUrl: '',
  fileType: 'pdf',
  sortOrder: '0'
}

export default function CourseMaterialsPage({ params }: { params: { centerId: string } }) {
  const centerId = params.centerId
  const [loading, setLoading] = useState(true)
  const [materials, setMaterials] = useState<any[]>([])
  const [courses, setCourses] = useState<CenterCoursePricingRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [centerSlug, setCenterSlug] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [matRes, coursesRes] = await Promise.all([
        authenticatedFetch(`/api/admin/course-materials?centerId=${centerId}`, { headers: authHeaders() }),
        authenticatedFetch(`/api/admin/course-fees?centerId=${centerId}`, { headers: authHeaders() }),
      ])
      if (matRes.ok) {
        const data = await matRes.json()
        setMaterials(data.materials || [])
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
    authenticatedFetch(`/api/admin/center/${centerId}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setCenterSlug(data.slug || ''))
      .catch(() => {})
  }, [load, centerId])

  const openCreate = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (m: any) => {
    setEditId(m.id)
    setForm({
      courseMasterId: String(m.course_master_id),
      title: m.title,
      description: m.description || '',
      fileUrl: m.file_url,
      fileType: m.file_type || 'pdf',
      sortOrder: String(m.sort_order || 0)
    })
    setFormError('')
    setShowForm(true)
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)
    setFormError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('centerId', centerId)
      setUploadProgress(30)
      const res = await authenticatedFetch('/api/admin/course-materials/upload', {
        method: 'POST',
        body: fd,
      })
      setUploadProgress(90)
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Upload failed')
        return
      }
      setForm((f) => ({ ...f, fileUrl: data.url, fileType: data.fileType || f.fileType }))
      setUploadProgress(100)
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(null), 800)
    }
  }

  const handleSave = async () => {
    setFormError('')
    setSaving(true)
    try {
      if (editId) {
        const res = await authenticatedFetch('/api/admin/course-materials', { method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            centerId: parseInt(centerId, 10),
            materialId: editId,
            title: form.title,
            description: form.description,
            fileUrl: form.fileUrl,
            fileType: form.fileType,
            sortOrder: parseInt(form.sortOrder, 10) || 0 })
        })
        const data = await res.json()
        if (!res.ok) {
          setFormError(data.error || 'Failed to update')
          return
        }
      } else {
        const res = await authenticatedFetch('/api/admin/course-materials', { method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            centerId: parseInt(centerId, 10),
            courseMasterId: parseInt(form.courseMasterId, 10),
            title: form.title,
            description: form.description,
            fileUrl: form.fileUrl,
            fileType: form.fileType,
            sortOrder: parseInt(form.sortOrder, 10) || 0,
            notifyStudents: true })
        })
        const data = await res.json()
        if (!res.ok) {
          setFormError(data.error || 'Failed to create')
          return
        }
      }
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (materialId: number) => {
    if (!(await confirmDialog({ message: 'Delete this material?', destructive: true }))) return
    await authenticatedFetch(`/api/admin/course-materials?centerId=${centerId}&materialId=${materialId}`, { method: 'DELETE', headers: authHeaders() })
    load()
  }

  const toggleActive = async (m: any) => {
    await authenticatedFetch('/api/admin/course-materials', { method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        centerId: parseInt(centerId, 10),
        materialId: m.id,
        isActive: !m.is_active })
    })
    load()
  }

  const columns: AdminTableColumn<any>[] = [
    {
      key: 'course',
      header: 'Course',
      sortValue: (m) => m.course_title || m.course_master_id,
      render: (m) => m.course_title || m.course_master_id,
    },
    {
      key: 'title',
      header: 'Title',
      sortValue: (m) => m.title,
      render: (m) => (
        <span className="font-medium text-[var(--cm-color-text)]">{m.title}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      hideOnMobile: true,
      sortValue: (m) => m.file_type,
      render: (m) => <span className="uppercase text-xs">{m.file_type}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (m) => (m.is_active ? 1 : 0),
      render: (m) => (
        <button
          type="button"
          onClick={() => void toggleActive(m)}
          className={`admin-badge ${m.is_active ? 'admin-badge-success' : 'admin-badge-danger'}`}
        >
          {m.is_active ? 'Active' : 'Hidden'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (m) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => openEdit(m)}
            className="admin-btn admin-btn--icon admin-btn--icon-edit"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleDelete(m.id)}
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
              <FileText className="h-7 w-7" />
              Course Study Materials
            </span>
          }
          description="Upload PDFs, links, and resources for enrolled students."
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${centerId}` },
            { label: 'Course Materials' },
          ]}
          actions={
            <AdminButton onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
              Add Material
            </AdminButton>
          }
        />

        <div className="admin-card p-4">
          <AdminDataTable
            columns={columns}
            rows={materials}
            rowKey={(m) => m.id}
            loading={loading}
            emptyMessage="No materials uploaded yet."
            caption="Course materials"
          />
        </div>
      </div>

      <FormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? 'Edit Material' : 'Add Study Material'}
        description={editId ? 'Update material details or replace the file.' : 'Upload a study material and attach it to a course.'}
        formError={formError}
        footer={
          <FormModalActions
            onCancel={() => setShowForm(false)}
            submitLabel={editId ? 'Update' : 'Upload'}
            isSubmitting={saving}
            formId="course-material-form"
          />
        }
      >
        <form
          id="course-material-form"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSave()
          }}
          noValidate
        >
          {!editId && (
            <AdminFormField label="Course" htmlFor="material-course" required>
              <select
                id="material-course"
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
          )}
          <AdminFormField label="Title" htmlFor="material-title" required>
            <input
              id="material-title"
              className="admin-form-control"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </AdminFormField>
          <AdminFormField label="Description" htmlFor="material-description">
            <textarea
              id="material-description"
              className="admin-form-control"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </AdminFormField>
          <AdminFormField
            label="File URL"
            htmlFor="material-file-url"
            required
            hint="Paste a URL or upload a file below"
          >
            <input
              id="material-file-url"
              className="admin-form-control"
              value={form.fileUrl}
              onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
              placeholder="/uploads/materials/... or https://..."
              required
            />
          </AdminFormField>
          <FileUploadField
            label="Upload file"
            value={form.fileUrl}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.mp4,.mp3"
            formatHint="PDF, Office, zip, audio/video · max 50MB"
            helpText="Drag a file here or click to upload. The File URL field updates automatically."
            previewLabel="Open uploaded file"
            uploading={uploading}
            progress={uploadProgress}
            onFile={(file) => handleFileUpload(file)}
            onClear={() => setForm((f) => ({ ...f, fileUrl: '' }))}
          />
          <div className="admin-form-row admin-form-row--2">
            <AdminFormField label="File Type" htmlFor="material-file-type">
              <select
                id="material-file-type"
                className="admin-form-control"
                value={form.fileType}
                onChange={(e) => setForm({ ...form, fileType: e.target.value })}
              >
                <option value="pdf">PDF</option>
                <option value="video">Video</option>
                <option value="link">Link</option>
                <option value="doc">Document</option>
              </select>
            </AdminFormField>
            <AdminFormField label="Sort Order" htmlFor="material-sort-order">
              <input
                id="material-sort-order"
                type="number"
                className="admin-form-control"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </AdminFormField>
          </div>
        </form>
      </FormModal>
    </AdminPageShell>
  )
}
