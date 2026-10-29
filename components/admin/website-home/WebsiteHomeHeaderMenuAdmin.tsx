'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  GitBranchPlus
} from 'lucide-react'
import { withBasePath } from '@/lib/with-base-path'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import AdminFormField from '@/components/admin/AdminFormField'
import RemixIcon from '@/components/admin/RemixIcon'
import type { HeaderMenuItem } from '@/types'
import {
  buildHeaderMenuFormPayload,
  canHaveHeaderMenuChildren,
  flattenHeaderMenuTree,
  formatHeaderMenuDestination,
  getHeaderMenuParentOptions,
  HEADER_MENU_HASH_PRESETS,
  HEADER_MENU_ICON_PRESETS,
  HEADER_MENU_PAGE_PRESETS,
  inferHeaderMenuLinkType,
  siblingsForHeaderMenuItem,
  slugifyMenuKey,
  type HeaderMenuFlatRow,
  type HeaderMenuLinkType
} from '@/lib/website-header-menu-admin'
import { confirmDialog } from '@/lib/admin-ui-store'

type MenuFormState = {
  menu_key: string
  parent_id: string
  title: string
  icon_class: string
  link_type: HeaderMenuLinkType
  link_url: string
  target_section: string
  display_order: number
  is_active: boolean
}

function defaultForm(parentId = '', order = 0): MenuFormState {
  return {
    menu_key: '',
    parent_id: parentId,
    title: '',
    icon_class: 'ri-link',
    link_type: 'page',
    link_url: '',
    target_section: '',
    display_order: order,
    is_active: true
  }
}

function rowToForm(row: HeaderMenuFlatRow): MenuFormState {
  return {
    menu_key: row.menu_key,
    parent_id: row.parent_id ? String(row.parent_id) : '',
    title: row.title,
    icon_class: row.icon_class || 'ri-link',
    link_type: inferHeaderMenuLinkType(row),
    link_url: row.link_url || '',
    target_section: row.target_section || '',
    display_order: row.display_order,
    is_active: row.is_active !== false
  }
}

function rowTypeLabel(row: HeaderMenuFlatRow, flat: HeaderMenuFlatRow[]): string {
  const hasChildren = flat.some((item) => item.parent_id === row.id)
  if (row.depth === 0 && hasChildren) return 'Top dropdown'
  if (row.depth === 0) return 'Top link'
  if (row.depth === 1 && hasChildren) return 'Mega section'
  if (row.depth === 1) return 'Dropdown item'
  return 'Mega link'
}

export default function WebsiteHomeHeaderMenuAdmin() {
  const [tree, setTree] = useState<HeaderMenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<HeaderMenuFlatRow | null>(null)
  const [form, setForm] = useState<MenuFormState>(defaultForm())
  const [formError, setFormError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')

  const apiBase = withBasePath('/api/super-admin/website-home/header-menu')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(apiBase, { credentials: 'include' })
      const data = await res.json()
      setTree(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      setTree([])
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    load()
  }, [load])

  const flat = useMemo(() => flattenHeaderMenuTree(tree), [tree])
  const parentOptions = useMemo(
    () => getHeaderMenuParentOptions(flat, editing?.id),
    [flat, editing?.id]
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return flat
    const q = search.toLowerCase()
    return flat.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        row.menu_key.toLowerCase().includes(q) ||
        formatHeaderMenuDestination(row).toLowerCase().includes(q)
    )
  }, [flat, search])
  const openCreate = (parent?: HeaderMenuFlatRow) => {
    setEditing(null)
    setFormError('')
    const siblings = parent ? siblingsForHeaderMenuItem(flat, parent) : flat.filter((r) => !r.parent_id)
    setForm(
      defaultForm(
        parent ? String(parent.id) : '',
        siblings.length > 0 ? Math.max(...siblings.map((s) => s.display_order)) + 1 : 0
      )
    )
    setOpen(true)
  }

  const openEditRow = (row: HeaderMenuFlatRow) => {
    setEditing(row)
    setFormError('')
    setForm(rowToForm(row))
    setOpen(true)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')

    if (!form.title.trim()) {
      setFormError('Title is required.')
      return
    }

    const payload = buildHeaderMenuFormPayload(form)

    try {
      const response = await fetch(apiBase, {
        credentials: 'include',
        method: editing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload)
      })

      if (!response.ok) {
        const err = await response.json()
        setFormError(err.error || 'Failed to save.')
        return
      }

      setOpen(false)
      setMessage(editing ? 'Menu item updated.' : 'Menu item created.')
      load()
    } catch {
      setFormError('Failed to save.')
    }
  }

  const remove = async (row: HeaderMenuFlatRow) => {
    const childCount = flat.filter((item) => item.parent_id === row.id).length
    const warning =
      childCount > 0
        ? `Delete "${row.title}" and its ${childCount} child item(s)?`
        : `Delete "${row.title}"?`
    if (!(await confirmDialog(warning))) return

    await superAdminFetch(`/api/super-admin/website-home/header-menu/${row.id}`, { method: 'DELETE' })
    setMessage('Menu item deleted.')
    load()
  }

  const moveItem = async (row: HeaderMenuFlatRow, direction: 'up' | 'down') => {
    const siblings = siblingsForHeaderMenuItem(flat, row)
    const index = siblings.findIndex((item) => item.id === row.id)
    const swapWith = direction === 'up' ? siblings[index - 1] : siblings[index + 1]
    if (!swapWith) return

    await Promise.all([
      fetch(apiBase, {
        credentials: 'include',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: row.id, display_order: swapWith.display_order })
      }),
      fetch(apiBase, {
        credentials: 'include',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: swapWith.id, display_order: row.display_order })
      }),
    ])
    load()
  }

  const resetDefaults = async () => {
    if (
      !(await confirmDialog({ message: 'Replace the entire header menu with defaults (About Us, Results, Courses mega menu, Centres, Jobs, Blog)? Custom items will be removed.', destructive: true }))
    ) {
      return
    }
    setResetting(true)
    await superAdminFetch('/api/super-admin/website-home/header-menu/seed-defaults', { method: 'POST' })
    setResetting(false)
    setMessage('Header menu reset to defaults.')
    load()
  }

  const setField = <K extends keyof MenuFormState>(key: K, value: MenuFormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'title' && !editing && !prev.menu_key.trim()) {
        next.menu_key = slugifyMenuKey(String(value))
      }
      return next
    })
  }

  return (
    <SuperAdminPageShell loading={loading}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Header Dropdown Menu
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
              Controls the live corporate header at <code className="text-xs">/</code>. Top-level
              items with children become dropdowns; Courses uses a mega menu with section headers
              and links. Items respect <strong>Section Toggles</strong> via their{' '}
              <code className="text-xs">menu_key</code> (e.g. about_us, results, courses).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={withBasePath('/')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Preview site header
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={resetDefaults}
              disabled={resetting}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
            >
              <RefreshCw className={`h-4 w-4 ${resetting ? 'animate-spin' : ''}`} />
              Reset to defaults
            </button>
            <button
              type="button"
              onClick={() => openCreate()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add top-level item
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Structure guide</h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <li>
                <strong>About Us</strong> — parent + 3 children (Overview, Philosophy, Promoters)
              </li>
              <li>
                <strong>Our Results</strong> — parent + exam links like{' '}
                <code className="text-xs">/results?exam=cat</code>
              </li>
              <li>
                <strong>Courses</strong> — mega menu: section headers (no link) + course links under
                College / School sections
              </li>
              <li>
                <strong>Centres, Jobs, Blog</strong> — simple top-level links
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Tips</h3>
            <p className="mt-2 text-sm text-blue-800 dark:text-blue-300">
              Use <strong>Section label only</strong> for mega menu headings (College Level Courses).
              Child links need a page URL. Icons show in dropdown rows on the public site.
            </p>
          </div>
        </div>

        {message ? (
          <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
        ) : null}

        <input
          type="search"
          placeholder="Search title, menu key, or URL..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
        />

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Item
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Type
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Destination
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Key
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Order
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Active
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    No menu items — add one or reset to defaults.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const siblings = siblingsForHeaderMenuItem(flat, row)
                  const siblingIndex = siblings.findIndex((item) => item.id === row.id)
                  return (
                    <tr key={row.id} className={row.is_active === false ? 'opacity-60' : undefined}>
                      <td className="px-3 py-3">
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${row.depth * 18}px` }}
                        >
                          <span className="admin-header-menu-table-icon shrink-0">
                            <RemixIcon name={row.icon_class || 'ri-link'} />
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{row.title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {rowTypeLabel(row, flat)}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {formatHeaderMenuDestination(row)}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-gray-500">{row.menu_key}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{row.display_order}</td>
                      <td className="px-3 py-3 text-sm">{row.is_active === false ? 'No' : 'Yes'}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button aria-label="Move up"
                            type="button"
                            title="Move up"
                            disabled={siblingIndex <= 0}
                            onClick={() => moveItem(row, 'up')}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button aria-label="Move down"
                            type="button"
                            title="Move down"
                            disabled={siblingIndex < 0 || siblingIndex >= siblings.length - 1}
                            onClick={() => moveItem(row, 'down')}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          {canHaveHeaderMenuChildren(row) ? (
                            <button
                              type="button"
                              title="Add child"
                              aria-label="Add child menu item"
                              onClick={() => openCreate(row)}
                              className="rounded p-1 text-green-600 hover:bg-green-50"
                            >
                              <GitBranchPlus className="h-4 w-4" />
                            </button>
                          ) : null}
                          <button aria-label="Edit"
                            type="button"
                            title="Edit"
                            onClick={() => openEditRow(row)}
                            className="rounded p-1 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button aria-label="Delete"
                            type="button"
                            title="Delete"
                            onClick={() => remove(row)}
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
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit — ${editing.title}` : 'Add menu item'}
        formError={formError}
        footer={
          <FormModalActions
            formId="website-home-header-menu-form"
            onCancel={() => setOpen(false)}
            submitLabel="Save menu item"
          />
        }
      >
        <form id="website-home-header-menu-form" onSubmit={save} noValidate>
          <AdminFormField label="Title" required>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              required
            />
          </AdminFormField>

          <AdminFormField
            label="Menu key"
            hint="Unique ID used by section toggles. Do not change seeded keys (about_us, results, courses)."
          >
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900"
              value={form.menu_key}
              onChange={(e) => setField('menu_key', e.target.value)}
              readOnly={Boolean(editing?.menu_key)}
            />
          </AdminFormField>

          <AdminFormField label="Parent item">
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
              value={form.parent_id}
              onChange={(e) => setField('parent_id', e.target.value)}
            >
              <option value="">Top level (main header)</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.label}
                </option>
              ))}
            </select>
          </AdminFormField>

          <AdminFormField label="Icon">
            <div className="admin-icon-preview-box">
              <span className="admin-icon-preview-box__icon">
                <RemixIcon name={form.icon_class} size="lg" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Selected icon</p>
                <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                  {form.icon_class || 'ri-link'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {HEADER_MENU_ICON_PRESETS.map((icon) => (
                <button
                  key={icon.className}
                  type="button"
                  title={icon.label}
                  onClick={() => setField('icon_class', icon.className)}
                  className={`admin-icon-picker-btn rounded-lg border ${
                    form.icon_class === icon.className
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/40'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <RemixIcon name={icon.className} />
                </button>
              ))}
            </div>
            <input
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-900"
              value={form.icon_class}
              onChange={(e) => setField('icon_class', e.target.value)}
              placeholder="ri-link"
            />
          </AdminFormField>

          <AdminFormField label="Link type">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['page', 'Page URL'],
                  ['hash', 'Homepage section'],
                  ['none', 'Section label only'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setField('link_type', value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    form.link_type === value
                      ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </AdminFormField>

          {form.link_type === 'page' ? (
            <AdminFormField label="Page URL" hint="e.g. /about, /results?exam=cat, /courses/67">
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
                value={form.link_url}
                onChange={(e) => setField('link_url', e.target.value)}
                list="header-menu-page-presets"
              />
              <datalist id="header-menu-page-presets">
                {HEADER_MENU_PAGE_PRESETS.map((preset) => (
                  <option key={preset.href} value={preset.href}>
                    {preset.label}
                  </option>
                ))}
              </datalist>
            </AdminFormField>
          ) : null}

          {form.link_type === 'hash' ? (
            <AdminFormField label="Homepage anchor" hint="Scrolls to a section on the homepage">
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
                value={form.target_section}
                onChange={(e) => setField('target_section', e.target.value)}
                list="header-menu-hash-presets"
                placeholder="#gallery"
              />
              <datalist id="header-menu-hash-presets">
                {HEADER_MENU_HASH_PRESETS.map((preset) => (
                  <option key={preset.hash} value={preset.hash}>
                    {preset.label}
                  </option>
                ))}
              </datalist>
            </AdminFormField>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminFormField label="Display order">
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
                value={form.display_order}
                onChange={(e) => setField('display_order', Number(e.target.value))}
              />
            </AdminFormField>

            <AdminFormField label="Visibility">
              <label className="inline-flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setField('is_active', e.target.checked)}
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">Show in header</span>
              </label>
            </AdminFormField>
          </div>

        </form>
      </FormModal>
    </SuperAdminPageShell>
  )
}
