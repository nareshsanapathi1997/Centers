'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Plus, Edit, Trash2 } from 'lucide-react'
import { withBasePath } from '@/lib/with-base-path'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import AdminFormField from '@/components/admin/AdminFormField'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import ImageUpload from '@/components/admin/ImageUpload'
import RichTextEditor from '@/components/admin/RichTextEditor'
import { WEBSITE_EXAM_CATEGORIES } from '@/lib/website-exam-categories'
import {
  normalizeResultEntryType,
  resultEntryHasImage,
  resultEntryHasText,
  resultEntryTypeLabel,
  type WebsiteResultEntryType
} from '@/lib/website-result-entry'
import { confirmDialog } from '@/lib/admin-ui-store'

type ResultRow = Record<string, unknown>

const ENTRY_TYPE_CARDS: { id: WebsiteResultEntryType; icon: string; description: string }[] = [
  {
    id: 'image',
    icon: 'ri-image-line',
    description: 'Upload a result poster or scorecard image. Opens in the gallery lightbox.'
  },
  {
    id: 'text',
    icon: 'ri-file-text-line',
    description: 'Rich text story — ranks, selections, highlights, tables, and links.'
  },
  {
    id: 'image_text',
    icon: 'ri-layout-left-line',
    description: 'Featured card with image and rich text side by side.'
  },
]

function defaultForm(): Record<string, unknown> {
  return {
    entry_type: 'image',
    title: '',
    content_html: '',
    image_url: '',
    result_year: new Date().getFullYear(),
    exam_category: '',
    display_order: 0,
    is_active: true
  }
}

function rowToForm(row: ResultRow | null): Record<string, unknown> {
  if (!row) return defaultForm()
  return {
    entry_type: normalizeResultEntryType(row.entry_type),
    title: row.title ?? '',
    content_html: row.content_html ?? '',
    image_url: row.image_url ?? '',
    result_year: row.result_year ?? new Date().getFullYear(),
    exam_category: row.exam_category ?? '',
    display_order: row.display_order ?? 0,
    is_active: row.is_active !== false
  }
}

export default function WebsiteHomeResultsAdmin() {
  const [rows, setRows] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ResultRow | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>(defaultForm)
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')

  const apiBase = withBasePath('/api/super-admin/website-home/results')
  const entryType = normalizeResultEntryType(formData.entry_type)
  const showImage = resultEntryHasImage(entryType)
  const showText = resultEntryHasText(entryType)

  const fetchRows = async () => {
    setLoading(true)
    try {
      const response = await fetch(apiBase, { credentials: 'include' })
      const data = await response.json()
      setRows(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRows()
  }, [apiBase])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((row) =>
      [row.title, row.entry_type, row.result_year, row.exam_category].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(q)
      )
    )
  }, [rows, search])

  const openCreate = () => {
    setEditing(null)
    setFormData(defaultForm())
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (row: ResultRow) => {
    setEditing(row)
    setFormData(rowToForm(row))
    setFormError('')
    setModalOpen(true)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')
    
    const isEdit = editing?.id != null
    const url = isEdit
      ? withBasePath(`/api/super-admin/website-home/results/${editing!.id}`)
      : apiBase
    const method = isEdit ? 'PATCH' : 'POST'

    try {
      const response = await fetch(url, {
        credentials: 'include',

        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const err = await response.json()
        setFormError(err.error || 'Failed to save')
        return
      }

      setModalOpen(false)
      fetchRows()
    } catch {
      setFormError('Failed to save')
    }
  }

  const remove = async (id: number) => {
    if (!(await confirmDialog({ message: 'Delete this result entry?', destructive: true }))) return
    await superAdminFetch(`/api/super-admin/website-home/results/${id}`, {
      method: 'DELETE',
    })
    fetchRows()
  }

  const setField = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <SuperAdminPageShell loading={loading}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Results</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Add result images, rich text highlights, or combined featured cards. Filter by year
              and exam on the public <code className="text-xs">/results</code> page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={withBasePath('/results')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Preview results page
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add result
            </button>
          </div>
        </div>

        <input
          type="search"
          placeholder="Search by title, year, exam, type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
        />

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Year
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Exam
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Active
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No results yet — add an image, text story, or featured card.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const type = normalizeResultEntryType(row.entry_type)
                  return (
                    <tr key={String(row.id)}>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                        {String(row.title ?? '—')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-200">
                          {resultEntryTypeLabel(type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                        {String(row.result_year ?? '—')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                        {String(row.exam_category || 'All')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                        {row.is_active === false ? 'No' : 'Yes'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button aria-label="Edit"
                            type="button"
                            onClick={() => openEdit(row)}
                            className="rounded p-1 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button aria-label="Delete"
                            type="button"
                            onClick={() => remove(Number(row.id))}
                            className="rounded p-1 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit result' : 'Add result'}
        formError={formError}
        footer={
          <FormModalActions
            formId="website-home-result-form"
            onCancel={() => setModalOpen(false)}
            submitLabel="Save result"
          />
        }
      >
        <form id="website-home-result-form" onSubmit={save} noValidate>

          <div>
            <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Entry type</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {ENTRY_TYPE_CARDS.map((card) => {
                const isActive = entryType === card.id
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setField('entry_type', card.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <i className={`${card.icon} mb-2 block text-xl text-purple-600`} aria-hidden />
                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                      {resultEntryTypeLabel(card.id)}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                      {card.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminFormField label="Title" required>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
                value={String(formData.title ?? '')}
                onChange={(e) => setField('title', e.target.value)}
              />
            </AdminFormField>

            <AdminFormField label="Result year" required hint="Used for year filters on /results">
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
                value={String(formData.result_year ?? '')}
                onChange={(e) => setField('result_year', Number(e.target.value))}
              />
            </AdminFormField>

            <AdminFormField label="Exam category">
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
                value={String(formData.exam_category ?? '')}
                onChange={(e) => setField('exam_category', e.target.value)}
              >
                <option value="">General / All exams</option>
                {WEBSITE_EXAM_CATEGORIES.map((exam) => (
                  <option key={exam.key} value={exam.key}>
                    {exam.label}
                  </option>
                ))}
              </select>
            </AdminFormField>

            <AdminFormField label="Display order">
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
                value={String(formData.display_order ?? 0)}
                onChange={(e) => setField('display_order', Number(e.target.value))}
              />
            </AdminFormField>
          </div>

          {showImage ? (
            <AdminFormField label="Result image" required={showImage && !showText}>
              <ImageUpload
                label=""
                value={String(formData.image_url ?? '')}
                onChange={(url) => setField('image_url', url)}
              />
            </AdminFormField>
          ) : null}

          {showText ? (
            <AdminFormField
              label="Rich text content"
              required
              hint="Headings, bullet lists, tables, links, and inline images supported."
            >
              <RichTextEditor
                value={String(formData.content_html ?? '')}
                onChange={(html) => setField('content_html', html)}
                minHeight="220px"
                placeholder="Write result highlights, rank lists, selection stats..."
              />
            </AdminFormField>
          ) : null}

          <AdminFormField label="Published">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active !== false}
                onChange={(e) => setField('is_active', e.target.checked)}
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">Show on website</span>
            </label>
          </AdminFormField>
        </form>
      </FormModal>
    </SuperAdminPageShell>
  )
}
