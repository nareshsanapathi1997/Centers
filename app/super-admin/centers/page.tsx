'use client'
import { withBasePath } from '@/lib/with-base-path'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useMemo, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import AdminFormField from '@/components/admin/AdminFormField'
import { useAdminFormValidation } from '@/components/admin/useAdminFormValidation'
import type { AdminFieldRules } from '@/lib/admin-form-validation'
import { hasAdminFieldErrors, validateAdminFields } from '@/lib/admin-form-validation'
import ImageUpload from '@/components/admin/ImageUpload'
import {
  GALLERY_RESULTS_IMAGE_HEIGHT,
  GALLERY_RESULTS_IMAGE_SIZE_LABEL,
  GALLERY_RESULTS_IMAGE_WIDTH
} from '@/lib/gallery-results-image-spec'
import { ADMIN_IMAGE_FORMAT_HINT } from '@/lib/admin-image-upload-validation'
import { Plus, Edit, Trash2, Eye, ExternalLink, MoreVertical, Building2 } from 'lucide-react'
import { toast, confirmDialog } from '@/lib/admin-ui-store'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'

interface Center {
  id: number
  slug: string
  name: string
  email?: string
  is_active: boolean
  created_at: string
}

function normalizeSlug(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-')
}

type StatusFilter = 'all' | 'active' | 'inactive'
type SortOption = 'name-asc' | 'name-desc' | 'newest' | 'oldest'

const CENTER_FORM_RULES: AdminFieldRules = {
  slug: [{ type: 'required' }, { type: 'slug' }],
  name: [{ type: 'required' }],
  email: [{ type: 'email' }],
  map_embed_url: [{ type: 'url', optional: true }],
  google_rating_url: [{ type: 'url', optional: true }]
}

function CentersManagementContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [centers, setCenters] = useState<Center[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name-asc')
  const [saving, setSaving] = useState(false)
  const [editingCenter, setEditingCenter] = useState<Center | null>(null)
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    description: '',
    email: '',
    phone: '',
    address: '',
    map_embed_url: '',
    google_rating: '',
    google_rating_url: '',
    center_image_url: '',
    is_active: true,
    list_on_nearby_host: false,
    nearby_host_center_id: '' as string | number
  })
  const { errors, formError, setFormError, clearErrors, clearFieldError, setErrors } =
    useAdminFormValidation(formData, CENTER_FORM_RULES)

  useEffect(() => {
    fetchCenters()
    if (searchParams.get('action') === 'create') {
      setIsModalOpen(true)
    }
  }, [searchParams])

  const filteredCenters = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    let result = centers.filter((center) => {
      if (statusFilter === 'active' && !center.is_active) return false
      if (statusFilter === 'inactive' && center.is_active) return false
      if (!query) return true
      return (
        center.name.toLowerCase().includes(query) ||
        center.slug.toLowerCase().includes(query) ||
        center.email?.toLowerCase().includes(query)
      )
    })

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name-asc':
        default:
          return a.name.localeCompare(b.name)
      }
    })

    return result
  }, [centers, searchQuery, statusFilter, sortBy])

  const hasActiveFilters =
    searchQuery.trim() !== '' || statusFilter !== 'all' || sortBy !== 'name-asc'

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setSortBy('name-asc')
  }

  const fetchCenters = async () => {
    try {
      const response = await superAdminFetch('/api/super-admin/centers')
      const data = await response.json()
      setCenters(data)
    } catch (error) {
      console.error('Error fetching centers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)

    const nextErrors = validateAdminFields(formData, CENTER_FORM_RULES)
    if (formData.google_rating) {
      const rating = parseFloat(formData.google_rating)
      if (Number.isNaN(rating) || rating < 0 || rating > 5) {
        nextErrors.google_rating = 'Rating must be between 0 and 5.'
      }
    }
    if (!formData.is_active && formData.list_on_nearby_host && !formData.nearby_host_center_id) {
      nextErrors.nearby_host_center_id = 'Select an active host center.'
    }
    setErrors(nextErrors)
    if (hasAdminFieldErrors(nextErrors)) {
      setSaving(false)
      return
    }

    if (!formData.is_active && formData.list_on_nearby_host && !formData.nearby_host_center_id) {
      setFormError('Select an active host center, or turn off “Show on host’s Our Centers list”.')
      setSaving(false)
      return
    }
    try {
      const url = withBasePath(
        editingCenter
          ? `/api/super-admin/centers/${editingCenter.id}`
          : '/api/super-admin/centers'
      )
      const method = editingCenter ? 'PATCH' : 'POST'

      const payload: Record<string, unknown> = {
        ...formData,
        nearby_host_center_id:
          formData.nearby_host_center_id === '' || formData.nearby_host_center_id == null
            ? null
            : Number(formData.nearby_host_center_id)
      }
      if (editingCenter && formData.is_active) {
        payload.list_on_nearby_host = false
        payload.nearby_host_center_id = null
      }
      const response = await fetch(url, {
        credentials: 'include',
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setIsModalOpen(false)
        setEditingCenter(null)
        resetForm()
        fetchCenters()
        router.push('/super-admin/centers')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error saving center')
      }
    } catch (error) {
      console.error('Error saving center:', error)
      toast.error('Error saving center')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (center: Center) => {
    setEditingCenter(center)
    // Fetch full center details
    try {
      const response = await superAdminFetch(`/api/super-admin/centers/${center.id}`)
      const fullCenter = await response.json()
      const inactive = !(fullCenter.is_active !== undefined ? fullCenter.is_active : center.is_active)
      const hostId = fullCenter.nearby_host_center_id
      setFormData({
        slug: fullCenter.slug || center.slug,
        name: fullCenter.name || center.name,
        description: fullCenter.description || '',
        email: fullCenter.email || center.email || '',
        phone: fullCenter.phone ? (Array.isArray(fullCenter.phone) ? fullCenter.phone.join(', ') : fullCenter.phone) : '',
        address: fullCenter.address || '',
        map_embed_url: fullCenter.map_embed_url || '',
        google_rating: fullCenter.google_rating ? String(fullCenter.google_rating) : '',
        google_rating_url: fullCenter.google_rating_url || '',
        center_image_url: fullCenter.center_image_url || '',
        is_active: fullCenter.is_active !== undefined ? fullCenter.is_active : center.is_active,
        list_on_nearby_host:
          inactive &&
          (fullCenter.list_on_nearby_host === true ||
            (hostId != null && hostId !== '')),
        nearby_host_center_id: hostId != null && hostId !== '' ? String(hostId) : ''
      })
    } catch (error) {
      // Fallback to basic info if fetch fails
      setFormData({
        slug: center.slug,
        name: center.name,
        description: '',
        email: center.email || '',
        phone: '',
        address: '',
        map_embed_url: '',
        google_rating: '',
        google_rating_url: '',
        center_image_url: '',
        is_active: center.is_active,
        list_on_nearby_host: false,
        nearby_host_center_id: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ message: 'Are you sure you want to delete this center? This will delete all associated data.', destructive: true }))) {
      return
    }
    try {
      const response = await superAdminFetch(`/api/super-admin/centers/${id}`, { method: 'DELETE' })

      if (response.ok) {
        fetchCenters()
      } else {
        toast.error('Error deleting center')
      }
    } catch (error) {
      console.error('Error deleting center:', error)
      toast.error('Error deleting center')
    }
  }

  const resetForm = () => {
    setFormData({
      slug: '',
      name: '',
      description: '',
      email: '',
      phone: '',
      address: '',
      map_embed_url: '',
      google_rating: '',
      google_rating_url: '',
      center_image_url: '',
      is_active: true,
      list_on_nearby_host: false,
      nearby_host_center_id: ''
    })
    clearErrors()
  }

  const activeHostOptions = centers.filter(
    (c) => c.is_active && (!editingCenter || c.id !== editingCenter.id)
  )

  if (loading) {
    return (
      <SuperAdminPageShell>
        <div className="space-y-6">
          <PageHeader
            title={<span className="flex items-center gap-2"><Building2 className="h-7 w-7" />Centers Management</span>}
            description="Create and manage all centers"
            breadcrumbs={[{ label: 'Super Admin', href: '/super-admin' }, { label: 'Centers' }]}
          />
          <LoadingSkeleton variant="table" rows={6} />
        </div>
      </SuperAdminPageShell>
    )
  }

  return (
    <SuperAdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={<span className="flex items-center gap-2"><Building2 className="h-7 w-7" />Centers Management</span>}
          description="Create and manage all centers"
          breadcrumbs={[{ label: 'Super Admin', href: '/super-admin' }, { label: 'Centers' }]}
          actions={
            <button
              type="button"
              onClick={() => {
                resetForm()
                setEditingCenter(null)
                setIsModalOpen(true)
              }}
              className="admin-btn admin-btn--primary admin-btn--md"
            >
              <Plus className="h-5 w-5" />
              Create Center
            </button>
          }
        />

        {/* Search & Filters */}
        <div className="admin-card space-y-4 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-form-control flex-1"
              placeholder="Search by name, slug, or email..."
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="admin-form-control lg:max-w-[180px]"
              aria-label="Sort centers"
            >
              <option value="name-asc">Name A → Z</option>
              <option value="name-desc">Name Z → A</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'All'],
                  ['active', 'Active'],
                  ['inactive', 'Inactive'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`admin-btn admin-btn--sm ${
                    statusFilter === value ? 'admin-btn--primary' : 'admin-btn--secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <span>
                Showing <strong className="text-gray-900 dark:text-white">{filteredCenters.length}</strong> of{' '}
                <strong className="text-gray-900 dark:text-white">{centers.length}</strong> centers
              </span>
              {hasActiveFilters ? (
                <button type="button" onClick={clearFilters} className="admin-btn admin-btn--ghost admin-btn--sm">
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Centers Table */}
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Center
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCenters.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={Building2}
                        title="No centers found"
                        message={hasActiveFilters ? 'Try adjusting your filters' : 'Create your first center'}
                        compact
                      />
                    </td>
                  </tr>
                ) : (
                  filteredCenters.map((center) => (
                    <tr
                      key={center.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                            {center.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {center.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">ID: {center.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {center.slug}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {center.email || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            center.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-2 ${
                              center.is_active ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          ></span>
                          {center.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/${center.slug}`}
                            target="_blank"
                            className="admin-btn admin-btn--icon admin-btn--icon-edit"
                            title="View Center"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/admin/${center.id}/dashboard`}
                            target="_blank"
                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Admin Panel"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button aria-label="Edit"
                            onClick={() => handleEdit(center)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button aria-label="Delete"
                            onClick={() => handleDelete(center.id)}
                            className="admin-btn admin-btn--icon admin-btn--icon-danger"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Modal */}
        <FormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingCenter(null)
            resetForm()
            router.push('/super-admin/centers')
          }}
          title={editingCenter ? 'Edit Center' : 'Create New Center'}
          size="large"
          formError={formError}
          footer={
            <FormModalActions
              formId="super-admin-center-form"
              onCancel={() => {
                setIsModalOpen(false)
                setEditingCenter(null)
                resetForm()
                router.push('/super-admin/centers')
              }}
              submitLabel={editingCenter ? 'Update Center' : 'Create Center'}
              isSubmitting={saving}
            />
          }
        >
          <form id="super-admin-center-form" onSubmit={handleSubmit} noValidate>
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Slug" htmlFor="center-slug" required error={errors.slug} hint="URL-friendly identifier">
                <input
                  id="center-slug"
                  type="text"
                  value={formData.slug}
                  onChange={(e) => {
                    setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })
                    clearFieldError('slug')
                  }}
                  className={`admin-form-control${errors.slug ? ' admin-form-control--invalid' : ''}`}
                  placeholder="center-slug"
                />
              </AdminFormField>
              <AdminFormField label="Name" htmlFor="center-name" required error={errors.name}>
                {editingCenter ? (
                  <input
                    id="center-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value })
                      clearFieldError('name')
                    }}
                    className={`admin-form-control${errors.name ? ' admin-form-control--invalid' : ''}`}
                    placeholder="Center name"
                  />
                ) : (
                  <input
                    id="center-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value
                      clearFieldError('name')
                      setFormData((prev) => ({
                        ...prev,
                        name,
                        slug: prev.slug || normalizeSlug(name)
                      }))
                    }}
                    className={`admin-form-control${errors.name ? ' admin-form-control--invalid' : ''}`}
                    placeholder="Center name"
                  />
                )}
              </AdminFormField>
            </div>
            <AdminFormField label="Description" htmlFor="center-description">
              <textarea
                id="center-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="admin-form-control"
                rows={3}
                placeholder="Center description"
              />
            </AdminFormField>
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Email" htmlFor="center-email" error={errors.email}>
                <input
                  id="center-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value })
                    clearFieldError('email')
                  }}
                  className={`admin-form-control${errors.email ? ' admin-form-control--invalid' : ''}`}
                  placeholder="center@example.com"
                />
              </AdminFormField>
              <AdminFormField label="Phone" htmlFor="center-phone">
                <input
                  id="center-phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="admin-form-control"
                  placeholder="+91 1234567890"
                />
              </AdminFormField>
            </div>
            <AdminFormField label="Address" htmlFor="center-address">
              <textarea
                id="center-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="admin-form-control"
                rows={2}
                placeholder="Center address"
              />
            </AdminFormField>
            <AdminFormField
              label="Google Maps embed URL"
              htmlFor="center-map"
              error={errors.map_embed_url}
              hint="Google Maps → Share → Embed a map → copy src URL"
            >
              <input
                id="center-map"
                type="url"
                value={formData.map_embed_url}
                onChange={(e) => {
                  setFormData({ ...formData, map_embed_url: e.target.value })
                  clearFieldError('map_embed_url')
                }}
                className={`admin-form-control${errors.map_embed_url ? ' admin-form-control--invalid' : ''}`}
                placeholder="https://www.google.com/maps/embed?pb=..."
              />
            </AdminFormField>
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Google rating" htmlFor="center-rating" error={errors.google_rating}>
                <input
                  id="center-rating"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.google_rating}
                  onChange={(e) => {
                    setFormData({ ...formData, google_rating: e.target.value })
                    clearFieldError('google_rating')
                  }}
                  className={`admin-form-control${errors.google_rating ? ' admin-form-control--invalid' : ''}`}
                  placeholder="4.5"
                />
              </AdminFormField>
              <AdminFormField label="Google rating URL" htmlFor="center-rating-url" error={errors.google_rating_url}>
                <input
                  id="center-rating-url"
                  type="url"
                  value={formData.google_rating_url}
                  onChange={(e) => {
                    setFormData({ ...formData, google_rating_url: e.target.value })
                    clearFieldError('google_rating_url')
                  }}
                  className={`admin-form-control${errors.google_rating_url ? ' admin-form-control--invalid' : ''}`}
                  placeholder="https://www.google.com/maps/place/..."
                />
              </AdminFormField>
            </div>
            <div>
              <ImageUpload
                label="Center Image (Our Centers card)"
                value={formData.center_image_url}
                onChange={(url) => setFormData({ ...formData, center_image_url: url })}
                folder="centers"
                centerId={editingCenter ? String(editingCenter.id) : undefined}
                minWidth={GALLERY_RESULTS_IMAGE_WIDTH}
                minHeight={GALLERY_RESULTS_IMAGE_HEIGHT}
                maxWidth={GALLERY_RESULTS_IMAGE_WIDTH}
                maxHeight={GALLERY_RESULTS_IMAGE_HEIGHT}
                helpText={`Upload a ${GALLERY_RESULTS_IMAGE_SIZE_LABEL} image (16:9) for the Our Centers section. ${ADMIN_IMAGE_FORMAT_HINT}.`}
              />
            </div>
            <div className="admin-form-checkgroup">
              <label className="admin-form-check">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => {
                    const active = e.target.checked
                    setFormData((prev) => ({
                      ...prev,
                      is_active: active,
                      ...(active ? { list_on_nearby_host: false, nearby_host_center_id: '' } : {})
                    }))
                  }}
                />
                <span>Center is active</span>
              </label>
              {!formData.is_active ? (
                <>
                  <label className="admin-form-check">
                    <input
                      type="checkbox"
                      checked={formData.list_on_nearby_host}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          list_on_nearby_host: e.target.checked,
                          nearby_host_center_id: e.target.checked ? prev.nearby_host_center_id : ''
                        }))
                      }
                    />
                    <span>Show on an active center&apos;s Our Centers list</span>
                  </label>
                  {formData.list_on_nearby_host ? (
                    <AdminFormField
                      label="Host center"
                      htmlFor="center-host"
                      required
                      error={errors.nearby_host_center_id}
                      hint="Inactive center appears on the host center home page."
                    >
                      <select
                        id="center-host"
                        value={formData.nearby_host_center_id === '' ? '' : String(formData.nearby_host_center_id)}
                        onChange={(e) => {
                          setFormData({ ...formData, nearby_host_center_id: e.target.value })
                          clearFieldError('nearby_host_center_id')
                        }}
                        className={`admin-form-control${errors.nearby_host_center_id ? ' admin-form-control--invalid' : ''}`}
                      >
                        <option value="">Select active center…</option>
                        {activeHostOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.slug})
                          </option>
                        ))}
                      </select>
                    </AdminFormField>
                  ) : null}
                </>
              ) : null}
            </div>
          </form>
        </FormModal>
      </div>
    </SuperAdminPageShell>
  )
}

export default function CentersManagement() {
  return (
    <Suspense
      fallback={
        <SuperAdminPageShell>
          <LoadingSkeleton variant="table" rows={6} />
        </SuperAdminPageShell>
      }
    >
      <CentersManagementContent />
    </Suspense>
  )
}
