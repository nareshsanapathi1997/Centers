'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import CourseMasterForm, {
  CourseMasterFormData,
  courseMasterFormToPayload,
  courseMasterToForm,
  emptyCourseMasterForm
} from '@/components/admin/CourseMasterForm'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import { COURSE_MASTERS_NAV } from '@/lib/course-masters-nav'
import {
  CourseMasterLevel,
  LEVEL_LABELS,
  getChildLevels,
  getParentLevels,
  getParentFieldLabel,
  courseMasterHref
} from '@/lib/course-masters'
import { Edit, ExternalLink, Plus, Search, Trash2 } from 'lucide-react'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

interface CourseMasterRow {
  id: number
  parent_id: number | null
  level_type: CourseMasterLevel
  title: string
  slug: string
  is_active: boolean
  display_order: number
}

interface CourseMastersLevelPanelProps {
  levelType: CourseMasterLevel
}

export default function CourseMastersLevelPanel({ levelType }: CourseMastersLevelPanelProps) {
  const searchParams = useSearchParams()
  const parentFilterId = useMemo(() => {
    const raw = searchParams.get('parent')
    if (!raw) return null
    const id = parseInt(raw, 10)
    return Number.isFinite(id) && id > 0 ? id : null
  }, [searchParams])

  const [items, setItems] = useState<CourseMasterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<CourseMasterFormData>(emptyCourseMasterForm(levelType))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const allowedParentLevels = getParentLevels(levelType)
  const childLevels = getChildLevels(levelType)
  const levelLabel = LEVEL_LABELS[levelType]
  const parentColumnLabel = getParentFieldLabel(levelType)

  const parentTitleMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const item of items) {
      map.set(item.id, item.title)
    }
    return map
  }, [items])

  const parentFilterTitle = parentFilterId ? parentTitleMap.get(parentFilterId) : null

  const levelItems = useMemo(() => {
    let rows = items.filter(
      (item) => item.level_type === levelType || (levelType === 'course' && item.level_type === 'leaf_course')
    )
    if (parentFilterId) {
      rows = rows.filter((item) => item.parent_id === parentFilterId)
    }
    return rows.sort((a, b) => a.display_order - b.display_order || a.title.localeCompare(b.title))
  }, [items, levelType, parentFilterId])

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return levelItems
    const q = searchQuery.toLowerCase()
    return levelItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        (item.parent_id != null && (parentTitleMap.get(item.parent_id) || '').toLowerCase().includes(q))
    )
  }, [levelItems, searchQuery, parentTitleMap])

  const parentOptions = useMemo(() => {
    if (allowedParentLevels.length === 0) return []
    return items
      .filter((i) => allowedParentLevels.includes(i.level_type))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [items, allowedParentLevels])

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const res = await superAdminFetch('/api/super-admin/course-masters')
      if (res.ok) {
        setItems(await res.json())
      }
    } catch (error) {
      console.error('Error fetching course masters:', error)
    } finally {
      setLoading(false)
    }
  }

  const uploadFile = async (file: File, folder = 'course-masters') => {
    const body = new FormData()
    body.append('file', file)
    body.append('folder', folder)
    const res = await superAdminFetch('/api/super-admin/upload', {
      method: 'POST',
      body,
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Upload failed')
      return null
    }
    return data.url as string
  }

  const openCreate = () => {
    setFormError('')
    setEditingId(null)
    const defaultParent =
      parentFilterId ??
      (parentOptions.length === 1 ? parentOptions[0].id : null)
    setFormData(emptyCourseMasterForm(levelType, defaultParent))
    setIsModalOpen(true)
  }

  const openEdit = async (id: number) => {
    setFormError('')
    try {
      const res = await superAdminFetch(`/api/super-admin/course-masters/${id}`)
      if (!res.ok) {
        toast.error('Failed to load course master')
        return
      }
      const data = await res.json()
      setEditingId(id)
      setFormData(courseMasterToForm(data))
      setIsModalOpen(true)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load course master')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    if (!formData.title.trim()) {
      setFormError('Title is required.')
      setSaving(false)
      return
    }
    if (formData.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug)) {
      setFormError('Slug must use lowercase letters, numbers, and hyphens only.')
      setSaving(false)
      return
    }
    if (allowedParentLevels.length > 0 && !formData.parent_id) {
      const message =
        levelType === 'sub_sub_variant' || levelType === 'course'
          ? 'Please select Main Course and Sub Course Variant.'
          : `Please select a ${parentColumnLabel}.`
      setFormError(message)
      setSaving(false)
      return
    }
    try {
      const payload = courseMasterFormToPayload(formData)
      const url = editingId
        ? `/api/super-admin/course-masters/${editingId}`
        : '/api/super-admin/course-masters'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await superAdminFetch(url, {
        method,
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Save failed')
        return
      }

      setIsModalOpen(false)
      setEditingId(null)
      fetchItems()
    } catch (error) {
      console.error(error)
      setFormError('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number, title: string) => {
    if (!(await confirmDialog({ message: `Delete "${title}"? Child items must be removed first.`, destructive: true }))) return
    try {
      const res = await superAdminFetch(`/api/super-admin/course-masters/${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Delete failed')
        return
      }
      fetchItems()
    } catch (error) {
      console.error(error)
      toast.error('Delete failed')
    }
  }

  return (
    <SuperAdminPageShell loading={loading} loadingMessage={`Loading ${levelLabel.toLowerCase()}...`}>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{levelLabel}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage {levelLabel.toLowerCase()} entries in the course catalog hierarchy.
            </p>
            {parentFilterId && parentFilterTitle ? (
              <p className="text-sm text-purple-700 dark:text-purple-300 mt-2">
                Filtered by parent: <strong>{parentFilterTitle}</strong>{' '}
                <Link
                  href={courseMasterHref(levelType)}
                  className="underline font-medium ml-1 text-purple-800 dark:text-purple-200"
                >
                  Clear filter
                </Link>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={openCreate}
            disabled={allowedParentLevels.length > 0 && parentOptions.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Add {levelLabel}
          </button>
        </div>

        <nav
          className="admin-level-nav border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800/80"
          aria-label="Course master levels"
        >
          {COURSE_MASTERS_NAV.map((nav) => (
            <Link
              key={nav.href}
              href={nav.href}
              className={`admin-level-nav__link${nav.level === levelType ? ' admin-level-nav__link--active' : ''}`}
            >
              {nav.label}
            </Link>
          ))}
        </nav>

        {allowedParentLevels.length > 0 && parentOptions.length === 0 ? (
          <div className="admin-form-section-note border border-dashed border-purple-300 dark:border-purple-500/50 bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-100">
            Create a parent entry first ({allowedParentLevels.map((l) => LEVEL_LABELS[l]).join(' or ')}) before
            adding {levelLabel.toLowerCase()} entries.{' '}
            {allowedParentLevels.map((parentLevel, index) => (
              <span key={parentLevel}>
                {index > 0 ? ' or ' : ''}
                <Link href={courseMasterHref(parentLevel)} className="underline font-semibold text-purple-800 dark:text-purple-200">
                  {LEVEL_LABELS[parentLevel]}
                </Link>
              </span>
            ))}
          </div>
        ) : null}

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder={`Search ${levelLabel.toLowerCase()} by title, slug, or parent...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-search-control w-full pl-10"
          />
        </div>

        <div className="admin-card overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No {levelLabel.toLowerCase()} entries yet
                {parentFilterTitle ? ` for "${parentFilterTitle}"` : ''}.
              </p>
              {!(allowedParentLevels.length > 0 && parentOptions.length === 0) ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="text-purple-600 dark:text-purple-400 font-medium hover:underline"
                >
                  Create {levelLabel}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="admin-data-table-wrap overflow-x-auto">
              <table className="admin-data-table w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Title</th>
                    {allowedParentLevels.length > 0 ? (
                      <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                        {parentColumnLabel}
                      </th>
                    ) : null}
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Slug</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Order</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    {childLevels.length > 0 ? (
                      <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Children</th>
                    ) : null}
                    <th className="text-right px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.title}</td>
                      {allowedParentLevels.length > 0 ? (
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {item.parent_id ? parentTitleMap.get(item.parent_id) || `#${item.parent_id}` : '—'}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">/{item.slug}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.display_order}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            item.is_active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {childLevels.length > 0 ? (
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {childLevels.map((childLevel) => (
                              <Link
                                key={childLevel}
                                href={courseMasterHref(childLevel, item.id)}
                                className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium hover:underline"
                              >
                                {LEVEL_LABELS[childLevel]}
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            ))}
                          </div>
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button aria-label="Edit"
                            type="button"
                            onClick={() => openEdit(item.id)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button aria-label="Delete"
                            type="button"
                            onClick={() => handleDelete(item.id, item.title)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingId(null)
          setFormError('')
        }}
        title={editingId ? `Edit ${levelLabel}` : `Create ${levelLabel}`}
        description={
          editingId
            ? `Update this ${levelLabel.toLowerCase()} and related content.`
            : `Create a new ${levelLabel.toLowerCase()} in the course master catalog.`
        }
        size="xlarge"
        formError={formError}
        footer={
          <FormModalActions
            formId="course-master-form"
            onCancel={() => {
              setIsModalOpen(false)
              setEditingId(null)
              setFormError('')
            }}
            submitLabel={editingId ? 'Update' : 'Create'}
            isSubmitting={saving}
          />
        }
      >
        <form id="course-master-form" onSubmit={handleSubmit} className="space-y-4">
          <CourseMasterForm
            formData={formData}
            setFormData={setFormData}
            hierarchyItems={items}
            uploadFile={uploadFile}
          />
        </form>
      </FormModal>
    </SuperAdminPageShell>
  )
}
