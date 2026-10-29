'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { withBasePath } from '@/lib/with-base-path'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import AdminFormField from '@/components/admin/AdminFormField'
import ImageUpload from '@/components/admin/ImageUpload'
import { Switch } from '@/components/forms'
import type { WebsiteHomeFieldDef, WebsiteHomeResourceDef } from '@/lib/website-home-resource-registry'
import { confirmDialog } from '@/lib/admin-ui-store'

type WebsiteHomeResourceManagerProps = {
  resource: WebsiteHomeResourceDef
  embedded?: boolean
}

function defaultValueForField(field: WebsiteHomeFieldDef): unknown {
  if (field.type === 'boolean') return true
  if (field.type === 'number') return 0
  if (field.type === 'string-list') return ''
  if (field.type === 'select' && field.options?.[0]) return field.options[0].value
  return ''
}

function rowToForm(row: Record<string, unknown> | null, fields: WebsiteHomeFieldDef[]) {
  const form: Record<string, unknown> = {}
  for (const field of fields) {
    const raw = row?.[field.key]
    if (field.type === 'string-list') {
      form[field.key] = Array.isArray(raw) ? raw.join('\n') : ''
    } else if (field.type === 'boolean') {
      form[field.key] = raw !== false
    } else if (field.key === 'is_notification') {
      form[field.key] = raw === true ? 'true' : 'false'
    } else {
      form[field.key] = raw ?? defaultValueForField(field)
    }
  }
  return form
}

export default function WebsiteHomeResourceManager({
  resource,
  embedded = false
}: WebsiteHomeResourceManagerProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>(() =>
    rowToForm(null, resource.fields)
  )
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')

  const apiBase = withBasePath(`/api/super-admin/website-home/${resource.slug}`)

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
  }, [resource.slug])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((row) =>
      resource.listColumns.some((col) => String(row[col] ?? '').toLowerCase().includes(q))
    )
  }, [rows, search, resource.listColumns])

  const openCreate = () => {
    setEditing(null)
    setFormData(rowToForm(null, resource.fields))
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row)
    setFormData(rowToForm(row, resource.fields))
    setFormError('')
    setModalOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    
    const isEdit = editing?.id != null && !resource.singleton
    const url = isEdit ? withBasePath(`/api/super-admin/website-home/${resource.slug}/${editing!.id}`) : apiBase
    const method = isEdit ? 'PATCH' : resource.singleton && rows[0] ? 'PATCH' : 'POST'
    const body = resource.singleton ? formData : { ...formData, ...(isEdit ? { id: editing!.id } : {}) }

    try {
      const response = await fetch(url, {
        credentials: 'include',

        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
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
    if (!(await confirmDialog({ message: 'Delete this item?', destructive: true }))) return
    await superAdminFetch(`/api/super-admin/website-home/${resource.slug}/${id}`, {
      method: 'DELETE',
    })
    fetchRows()
  }

  const renderField = (field: WebsiteHomeFieldDef) => {
    const value = formData[field.key]

    if (field.type === 'image') {
      return (
        <AdminFormField key={field.key} label={field.label} required={field.required} hint={field.helpText}>
          <ImageUpload
            label=""
            value={String(value || '')}
            onChange={(url) => setFormData((prev) => ({ ...prev, [field.key]: url }))}
          />
        </AdminFormField>
      )
    }

    if (field.type === 'boolean') {
      return (
        <Switch
          key={field.key}
          id={`wh-${resource.slug}-${field.key}`}
          label={field.label}
          hint={field.helpText}
          checked={Boolean(value)}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, [field.key]: checked }))}
        />
      )
    }

    if (field.type === 'select') {
      return (
        <AdminFormField key={field.key} label={field.label} required={field.required}>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
            value={String(value ?? '')}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
          >
            {(field.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </AdminFormField>
      )
    }

    if (field.type === 'textarea' || field.type === 'string-list') {
      return (
        <AdminFormField key={field.key} label={field.label} required={field.required} hint={field.helpText}>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
            rows={field.type === 'string-list' ? 5 : 4}
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
          />
        </AdminFormField>
      )
    }

    return (
      <AdminFormField key={field.key} label={field.label} required={field.required} hint={field.helpText}>
        <input
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value
            }))
          }
        />
      </AdminFormField>
    )
  }

  return (
    <SuperAdminPageShell loading={loading && !embedded}>
      <div className="space-y-4">
        {!embedded ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{resource.label}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage content for the website home page
              </p>
            </div>
            {!resource.singleton ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add New
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openEdit(rows[0] || null)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Edit className="h-4 w-4" />
                {rows[0] ? 'Edit' : 'Create'}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {!resource.singleton ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add promoter
              </button>
            ) : null}
          </div>
        )}

        {!resource.singleton && !embedded ? (
          <input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
          />
        ) : null}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                {resource.listColumns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
                {!resource.singleton ? <th className="px-4 py-3 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={resource.listColumns.length + (resource.singleton ? 0 : 1)}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No items yet
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={String(row.id)}>
                    {resource.listColumns.map((col) => (
                      <td key={col} className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                        {typeof row[col] === 'boolean' ? (row[col] ? 'Yes' : 'No') : String(row[col] ?? '—')}
                      </td>
                    ))}
                    {!resource.singleton ? (
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
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${resource.label}` : `Add ${resource.label}`}
        formError={formError}
        footer={
          <FormModalActions
            formId="website-home-resource-form"
            onCancel={() => setModalOpen(false)}
            submitLabel="Save"
          />
        }
      >
        <form id="website-home-resource-form" onSubmit={save} noValidate>
          {resource.fields.map(renderField)}
        </form>
      </FormModal>
    </SuperAdminPageShell>
  )
}
