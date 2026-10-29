'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, Edit, Inbox, Plus, Trash2, XCircle } from 'lucide-react'
import { withBasePath } from '@/lib/with-base-path'
import { useAdminFetch } from '@/lib/use-admin-fetch'
import { authenticatedFetch } from '@/lib/admin-api'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import AdminFormField from '@/components/admin/AdminFormField'
import { useAdminFormValidation } from '@/components/admin/useAdminFormValidation'
import Pagination from '@/components/admin/Pagination'
import BulkActions from '@/components/admin/BulkActions'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import PageHeader from '@/components/ui/PageHeader'
import { Input, Switch } from '@/components/forms'
import { adminControlClass } from '@/lib/admin-form-ui'
import { toast, confirmDialog } from '@/lib/admin-ui-store'
import type {
  AdminContentCrudDef,
  AdminContentFieldDef,
} from '@/lib/admin-content-resource-registry'

type AdminContentCrudPageProps = {
  centerId: string
  resource: AdminContentCrudDef
}

function defaultForm(resource: AdminContentCrudDef): Record<string, unknown> {
  return { ...(resource.defaults || {}) }
}

function rowToForm(row: Record<string, unknown> | null, resource: AdminContentCrudDef) {
  const form = defaultForm(resource)
  if (!row) return form
  for (const field of resource.fields) {
    const raw = row[field.key]
    if (field.type === 'boolean') form[field.key] = raw !== false
    else if (field.type === 'number') form[field.key] = Number(raw ?? 0)
    else form[field.key] = raw ?? ''
  }
  if ('display_order' in form && row.display_order != null) {
    form.display_order = Number(row.display_order)
  }
  return form
}

function renderCell(value: unknown, render?: 'text' | 'boolean' | 'truncate') {
  if (render === 'boolean') {
    const active = value !== false
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
          active
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
        }`}
      >
        {active ? (
          <>
            <CheckCircle className="w-3 h-3 mr-1.5" />
            Active
          </>
        ) : (
          <>
            <XCircle className="w-3 h-3 mr-1.5" />
            Inactive
          </>
        )}
      </span>
    )
  }
  const text = value == null ? '' : String(value)
  if (render === 'truncate') {
    return <div className="text-sm font-semibold text-[var(--cm-color-text)] line-clamp-2">{text}</div>
  }
  return <div className="text-sm text-[var(--cm-color-text-muted)]">{text}</div>
}

export default function AdminContentCrudPage({ centerId, resource }: AdminContentCrudPageProps) {
  const pageSize = resource.features?.pageSize ?? 10
  const bulkEnabled = resource.features?.bulk !== false
  const paginationEnabled = resource.features?.pagination !== false

  const [filtered, setFiltered] = useState<Record<string, unknown>[]>([])
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [form, setForm] = useState<Record<string, unknown>>(() => defaultForm(resource))
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(form, resource.formRules)

  const { data: listData, loading, refetch: fetchList, error: fetchError } = useAdminFetch<
    Record<string, unknown>[]
  >(
    `${resource.cacheKeyPrefix}-${centerId}`,
    `/api/admin/${resource.apiPath}?centerId=${centerId}`,
    {
      auth: true,
      parse: (json) => (Array.isArray(json) ? (json as Record<string, unknown>[]) : []),
    }
  )
  const list = listData ?? []

  useEffect(() => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      setFiltered(
        list.filter((row) =>
          resource.searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
        )
      )
    } else {
      setFiltered(list)
    }
    setCurrentPage(1)
    setSelectedIds([])
  }, [searchQuery, list, resource.searchKeys])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginated = useMemo(
    () => (paginationEnabled ? filtered.slice(startIndex, endIndex) : filtered),
    [filtered, paginationEnabled, startIndex, endIndex]
  )

  const openAdd = () => {
    setEditing(null)
    setForm({ ...defaultForm(resource), display_order: list.length })
    clearErrors()
    setModal(true)
  }

  const openEdit = (row: Record<string, unknown>) => {
    clearErrors()
    setEditing(row)
    setForm(rowToForm(row, resource))
    setModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!validate(form)) return

    setSaving(true)
    try {
      const isEdit = editing?.id != null
      const url = withBasePath(
        isEdit ? `/api/admin/${resource.apiPath}/${editing!.id}` : `/api/admin/${resource.apiPath}`
      )
      const includeCenter = resource.includeCenterIdOnCreate !== false
      const body = isEdit
        ? { ...form }
        : { ...form, ...(includeCenter ? { center_id: parseInt(centerId, 10) } : {}) }

      const res = await authenticatedFetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setModal(false)
        setEditing(null)
        fetchList(true)
      } else {
        const err = await res.json().catch(() => ({}))
        setFormError(err.error || 'Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ message: `Delete this ${resource.title.toLowerCase()} item?`, destructive: true }))) {
      return
    }
    const res = await authenticatedFetch(`/api/admin/${resource.apiPath}/${id}`, { method: 'DELETE' })
    if (res.ok) fetchList(true)
    else toast.error((await res.json().catch(() => ({}))).error || 'Delete failed')
  }

  const bulk = async (payload: Record<string, unknown>) => {
    const res = await authenticatedFetch(
      `/api/admin/${resource.apiPath}/bulk?centerId=${centerId}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
    if (res.ok) {
      setSelectedIds([])
      fetchList(true)
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || 'Bulk action failed')
    }
  }

  const renderField = (field: AdminContentFieldDef) => {
    const value = form[field.key]
    const control = (() => {
      if (field.type === 'textarea') {
        return (
          <textarea
            value={String(value ?? '')}
            onChange={(e) => {
              clearFieldError(field.key)
              setForm({ ...form, [field.key]: e.target.value })
            }}
            className={adminControlClass(errors, field.key)}
            rows={3}
            placeholder={field.placeholder}
          />
        )
      }
      if (field.type === 'boolean') {
        return (
          <Switch
            id={`crud-${field.key}`}
            label={field.label}
            checked={value !== false}
            onCheckedChange={(checked) => setForm({ ...form, [field.key]: checked })}
          />
        )
      }
      if (field.type === 'select') {
        return (
          <select
            value={String(value ?? '')}
            onChange={(e) => {
              clearFieldError(field.key)
              setForm({ ...form, [field.key]: e.target.value })
            }}
            className={adminControlClass(errors, field.key)}
          >
            {(field.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )
      }
      return (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={value == null ? '' : String(value)}
          onChange={(e) => {
            clearFieldError(field.key)
            const next =
              field.type === 'number' ? Number(e.target.value || 0) : e.target.value
            setForm({ ...form, [field.key]: next })
          }}
          className={adminControlClass(errors, field.key)}
          placeholder={field.placeholder}
        />
      )
    })()

    if (field.type === 'boolean') {
      return <div key={field.key}>{control}</div>
    }

    const wrapped = (
      <AdminFormField
        key={field.key}
        label={field.label}
        required={field.required}
        error={errors[field.key]}
        hint={field.helpText}
      >
        {control}
      </AdminFormField>
    )

    if (field.col === 'half') {
      return (
        <div key={field.key} className="admin-form-col-6">
          {wrapped}
        </div>
      )
    }
    return wrapped
  }

  const halfFields = resource.fields.filter((f) => f.col === 'half')
  const fullFields = resource.fields.filter((f) => f.col !== 'half')
  const singular = resource.title.replace(/s$/, '')

  const columns: AdminTableColumn<Record<string, unknown>>[] = [
    ...resource.listColumns.map((col, colIndex) => ({
      key: col.key,
      header: col.label,
      hideOnMobile: resource.listColumns.length > 2 && colIndex >= 1,
      sortValue: (row: Record<string, unknown>) => {
        const v = row[col.key]
        if (typeof v === 'number' || typeof v === 'string') return v
        if (typeof v === 'boolean') return v ? 1 : 0
        return v == null ? null : String(v)
      },
      render: (row: Record<string, unknown>) => renderCell(row[col.key], col.render),
    })),
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      render: (row: Record<string, unknown>) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Edit"
            onClick={() => openEdit(row)}
            className="admin-btn admin-btn--icon admin-btn--icon-edit"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={() => void handleDelete(Number(row.id))}
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
    <AdminPageShell error={fetchError} onRetry={() => void fetchList(true)}>
      <div className="space-y-6">
        <PageHeader
          title={resource.title}
          description={resource.description}
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${centerId}` },
            { label: resource.title },
          ]}
          actions={
            <button type="button" onClick={openAdd} className="admin-btn admin-btn--primary admin-btn--md">
              <Plus className="w-5 h-5" />
              Add {singular}
            </button>
          }
        />

        <div className="admin-card space-y-4 p-4">
          <div className="max-w-md">
            <Input
              type="search"
              placeholder={`Search ${resource.title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={`Search ${resource.title}`}
            />
          </div>

          <AdminDataTable
            columns={columns}
            rows={paginated}
            rowKey={(row) => Number(row.id)}
            loading={loading}
            emptyMessage={
              searchQuery
                ? 'No items match your search.'
                : `No ${resource.title.toLowerCase()} yet. Create your first item.`
            }
            emptyIcon={<Inbox className="h-12 w-12" />}
            caption={resource.title}
            selection={
              bulkEnabled
                ? {
                    selectedKeys: selectedIds,
                    onChange: (keys) => setSelectedIds(keys.map(Number)),
                  }
                : undefined
            }
          />

          {paginationEnabled && filtered.length > 0 ? (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={pageSize}
              startIndex={startIndex}
              endIndex={Math.min(endIndex, filtered.length)}
              onPageChange={setCurrentPage}
            />
          ) : null}
        </div>
      </div>

      <FormModal
        isOpen={modal}
        onClose={() => {
          setModal(false)
          setEditing(null)
          clearErrors()
        }}
        title={editing ? `Edit ${singular}` : `Create ${singular}`}
        description={editing ? `Update this ${singular.toLowerCase()}.` : `Add a new ${singular.toLowerCase()}.`}
        formError={formError}
        footer={
          <FormModalActions
            formId="admin-content-crud-form"
            onCancel={() => {
              setModal(false)
              setEditing(null)
              clearErrors()
            }}
            submitLabel={editing ? 'Update' : 'Create'}
            isSubmitting={saving}
          />
        }
      >
        <form id="admin-content-crud-form" onSubmit={handleSubmit} noValidate>
          {fullFields.map(renderField)}
          {halfFields.length > 0 && (
            <div className="admin-form-row admin-form-row--2">{halfFields.map(renderField)}</div>
          )}
        </form>
      </FormModal>

      {bulkEnabled && (
        <BulkActions
          selectedIds={selectedIds}
          onBulkDelete={async () => {
            if (selectedIds.length === 0) return
            if (
              !(await confirmDialog({
                message: `Delete ${selectedIds.length} item(s)?`,
                destructive: true,
              }))
            ) {
              return
            }
            await bulk({ ids: selectedIds, action: 'delete' })
          }}
          onBulkActivate={async () => {
            if (selectedIds.length === 0) return
            await bulk({ ids: selectedIds, action: 'status', is_active: true })
          }}
          onBulkDeactivate={async () => {
            if (selectedIds.length === 0) return
            await bulk({ ids: selectedIds, action: 'status', is_active: false })
          }}
          onClearSelection={() => setSelectedIds([])}
        />
      )}
    </AdminPageShell>
  )
}
