'use client'
import { withBasePath } from '@/lib/with-base-path'
import { authenticatedFetch } from '@/lib/admin-api'

import { useEffect, useState } from 'react'
import { useAdminFetch } from '@/lib/use-admin-fetch'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import AdminFormField from '@/components/admin/AdminFormField'
import MultiFilePickField from '@/components/forms/MultiFilePickField'
import { useAdminFormValidation } from '@/components/admin/useAdminFormValidation'
import Pagination from '@/components/admin/Pagination'
import { ADMIN_CONTENT_FORM_RULES } from '@/lib/admin-content-form-rules'
import { adminControlClass } from '@/lib/admin-form-ui'
import BulkActions from '@/components/admin/BulkActions'
import PageHeader from '@/components/ui/PageHeader'
import { Input } from '@/components/forms'
import { Plus, Edit, Trash2, Image as ImageIcon, Video, CheckCircle, XCircle, Camera, Upload, Inbox } from 'lucide-react'
import ImageUpload from '@/components/admin/ImageUpload'
import SafeImage from '@/components/ui/SafeImage'
import {
  GALLERY_RESULTS_IMAGE_HEIGHT,
  GALLERY_RESULTS_IMAGE_SIZE_LABEL,
  GALLERY_RESULTS_IMAGE_WIDTH
} from '@/lib/gallery-results-image-spec'
import { validateGalleryResultsImageFiles } from '@/lib/image-dimensions'
import {
  ADMIN_IMAGE_ACCEPT,
  ADMIN_IMAGE_FORMAT_HINT,
  validateAdminImageFiles
} from '@/lib/admin-image-upload-validation'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

export default function GalleryManagement({ params }: { params: { centerId: string } }) {
  const [filteredItems, setFilteredItems] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [bulkUploadFiles, setBulkUploadFiles] = useState<File[]>([])
  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    gallery_type: 'general',
    display_order: 0,
    is_active: true
  })
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, ADMIN_CONTENT_FORM_RULES.gallery)

  const { data: itemsData, loading, error, refetch: fetchItems } = useAdminFetch<any[]>(
    `admin-gallery-${params.centerId}`,
    `/api/admin/gallery?centerId=${params.centerId}`,
  )
  const items = itemsData ?? []

  useEffect(() => {
    if (searchQuery) {
      const filtered = items.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.gallery_type?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredItems(filtered)
    } else {
      setFilteredItems(items)
    }
    setCurrentPage(1)
  }, [searchQuery, items])

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!validate(formData)) return

    try {
      const url = withBasePath(editingItem ? `/api/admin/gallery/${editingItem.id}` : '/api/admin/gallery')
      const method = editingItem ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        credentials: 'include',
        method,
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...formData, center_id: parseInt(params.centerId) })
      })

      if (response.ok) {
        setIsModalOpen(false)
        setEditingItem(null)
        resetForm()
        fetchItems(true)
      } else {
        const error = await response.json()
        setFormError(error.error || 'Failed to save gallery item')
      }
    } catch (error) {
      console.error('Error saving item:', error)
      setFormError('Error saving gallery item')
    }
  }

  const handleEdit = (item: any) => {
    clearErrors()
    setEditingItem(item)
    setFormData({
      title: item.title || '',
      image_url: item.image_url || '',
      gallery_type: item.gallery_type || 'general',
      display_order: item.display_order || 0,
      is_active: item.is_active !== false
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog('Are you sure?'))) return
    try {
      
      const response = await authenticatedFetch(`/api/admin/gallery/${id}`, { method: 'DELETE' })

      if (response.ok) {
        fetchItems(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete gallery item')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Error deleting gallery item')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      image_url: '',
      gallery_type: 'general',
      display_order: 0,
      is_active: true
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!(await confirmDialog({ message: `Are you sure you want to delete ${selectedIds.length} item(s)?`, destructive: true }))) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/gallery/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'delete' })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchItems(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete items')
      }
    } catch (error) {
      console.error('Error deleting items:', error)
      toast.error('Error deleting items')
    }
  }

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/gallery/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'status', is_active: true })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchItems(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to activate items')
      }
    } catch (error) {
      console.error('Error activating items:', error)
      toast.error('Error activating items')
    }
  }

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/gallery/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'status', is_active: false })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchItems(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to deactivate items')
      }
    } catch (error) {
      console.error('Error deactivating items:', error)
      toast.error('Error deactivating items')
    }
  }

  const handleBulkUpload = async (files: File[], galleryType: string) => {
    const formatError = validateAdminImageFiles(files)
    if (formatError) {
      toast.error(formatError)
      return
    }

    const dimensionError = await validateGalleryResultsImageFiles(files)
    if (dimensionError) {
      toast.error(dimensionError)
      return
    }

    try {
      
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('images', file)
      })
      formData.append('gallery_type', galleryType)
      formData.append('center_id', params.centerId)

      const response = await authenticatedFetch('/api/admin/gallery/bulk-upload', { method: 'POST',
                body: formData })

      if (response.ok) {
        setIsBulkUploadOpen(false)
        setBulkUploadFiles([])
        fetchItems(true)
        toast.success(`Successfully uploaded ${files.length} image(s)`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to upload images')
      }
    } catch (error) {
      console.error('Error uploading images:', error)
      toast.error('Error uploading images')
    }
  }

  const getGalleryTypeIcon = (type: string) => {
    switch (type) {
      case 'videos':
        return <Video className="w-4 h-4" />
      case 'photos':
        return <Camera className="w-4 h-4" />
      default:
        return <ImageIcon className="w-4 h-4" />
    }
  }

  const getGalleryTypeColors = (type: string) => {
    switch (type) {
      case 'videos':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'photos':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    }
  }

  const columns: AdminTableColumn<any>[] = [
    {
      key: 'title',
      header: 'Title',
      sortValue: (item) => item.title || '',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className={`p-2 rounded-lg ${getGalleryTypeColors(item.gallery_type)}`}>
              {getGalleryTypeIcon(item.gallery_type)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--cm-color-text)] truncate">
              {item.title || 'Untitled'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      hideOnMobile: true,
      sortValue: (item) => item.gallery_type || '',
      render: (item) => (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getGalleryTypeColors(item.gallery_type)}`}>
          {getGalleryTypeIcon(item.gallery_type)}
          <span className="ml-1.5 capitalize">{item.gallery_type}</span>
        </span>
      ),
    },
    {
      key: 'image',
      header: 'Image',
      hideOnMobile: true,
      render: (item) =>
        item.image_url ? (
          <SafeImage
            src={item.image_url}
            alt={item.title}
            className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-sm"
          />
        ) : (
          <div className="flex items-center gap-2 text-[var(--cm-color-text-muted)]">
            <ImageIcon className="w-5 h-5" />
            <span className="text-sm">No image</span>
          </div>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (item) => (item.is_active ? 1 : 0),
      render: (item) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            item.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {item.is_active ? (
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
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Edit"
            onClick={() => handleEdit(item)}
            className="admin-btn admin-btn--icon admin-btn--icon-edit"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={() => void handleDelete(item.id)}
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
    <AdminPageShell error={error} onRetry={() => void fetchItems(true)}>
      <div className="space-y-6">
        <PageHeader
          title="Gallery"
          description="Manage gallery images and media for your center"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Gallery' },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsBulkUploadOpen(true)}
                className="admin-btn admin-btn--success admin-btn--md whitespace-nowrap"
              >
                <Upload className="w-5 h-5" />
                Bulk Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  clearErrors()
                  setEditingItem(null)
                  setIsModalOpen(true)
                }}
                className="admin-btn admin-btn--primary admin-btn--md whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Add New Item
              </button>
            </div>
          }
        />

        <div className="admin-card space-y-4 p-4">
          <div className="max-w-md">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or type..."
              aria-label="Search gallery"
            />
          </div>

          <AdminDataTable
            columns={columns}
            rows={paginatedItems}
            rowKey={(item) => item.id}
            loading={loading}
            emptyMessage={
              searchQuery
                ? 'No gallery items match your search.'
                : 'No gallery items found. Create your first gallery item.'
            }
            emptyIcon={<Inbox className="h-12 w-12" />}
            caption="Gallery items"
            selection={{
              selectedKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys.map(Number)),
            }}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredItems.length}
            itemsPerPage={itemsPerPage}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
          />
        </div>

        <FormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingItem(null)
            resetForm()
            clearErrors()
          }}
          title={editingItem ? 'Edit Gallery Item' : 'Add Gallery Item'}
          formError={formError}
          footer={
            <FormModalActions
              formId="gallery-item-form"
              onCancel={() => {
                setIsModalOpen(false)
                setEditingItem(null)
                resetForm()
                clearErrors()
              }}
              submitLabel={editingItem ? 'Update Item' : 'Create Item'}
            />
          }
        >
          <form id="gallery-item-form" onSubmit={handleSubmit} noValidate>
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Title" required error={errors.title} className="admin-form-col-6">
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    clearFieldError('title')
                    setFormData({ ...formData, title: e.target.value })
                  }}
                  className={adminControlClass(errors, 'title')}
                  placeholder="Enter gallery item title"
                />
              </AdminFormField>
              <AdminFormField label="Gallery Type" className="admin-form-col-6">
                <select
                  value={formData.gallery_type}
                  onChange={(e) => setFormData({ ...formData, gallery_type: e.target.value })}
                  className="admin-form-control"
                >
                  <option value="general">General</option>
                  <option value="photos">Photos</option>
                  <option value="videos">Videos</option>
                </select>
              </AdminFormField>
            </div>
            <AdminFormField label="Image" required error={errors.image_url}>
              <ImageUpload
                label=""
                value={formData.image_url}
                onChange={(url) => {
                  clearFieldError('image_url')
                  setFormData({ ...formData, image_url: url })
                }}
                folder="gallery"
                centerId={params.centerId}
                minWidth={GALLERY_RESULTS_IMAGE_WIDTH}
                minHeight={GALLERY_RESULTS_IMAGE_HEIGHT}
                maxWidth={GALLERY_RESULTS_IMAGE_WIDTH}
                maxHeight={GALLERY_RESULTS_IMAGE_HEIGHT}
                helpText={`Upload a ${GALLERY_RESULTS_IMAGE_SIZE_LABEL} image (16:9).`}
              />
            </AdminFormField>
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Display Order" className="admin-form-col-6">
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="admin-form-control"
                  placeholder="0"
                />
              </AdminFormField>
              <div className="admin-form-col-6">
                <label className="admin-form-label">Status</label>
                <label htmlFor="is_active" className="admin-form-check admin-form-check--field">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>
          </form>
        </FormModal>

        {/* Bulk Upload Modal */}
        <FormModal
          isOpen={isBulkUploadOpen}
          onClose={() => {
            setIsBulkUploadOpen(false)
            setBulkUploadFiles([])
          }}
          title="Bulk Upload Images"
          footer={
            <FormModalActions
              formId="gallery-bulk-upload-form"
              onCancel={() => {
                setIsBulkUploadOpen(false)
                setBulkUploadFiles([])
              }}
              submitLabel={
                bulkUploadFiles.length > 0
                  ? `Upload ${bulkUploadFiles.length} Image(s)`
                  : 'Upload Image(s)'
              }
              submitDisabled={bulkUploadFiles.length === 0}
            />
          }
        >
          <form
            id="gallery-bulk-upload-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (bulkUploadFiles.length === 0) {
                toast.error('Please select at least one image')
                return
              }
              const galleryType =
                (document.getElementById('bulk-gallery-type') as HTMLSelectElement)?.value || 'general'
              handleBulkUpload(bulkUploadFiles, galleryType)
            }}
            noValidate
          >
            <MultiFilePickField
              label="Images"
              files={bulkUploadFiles}
              onChange={setBulkUploadFiles}
              accept={ADMIN_IMAGE_ACCEPT}
              formatHint={`${GALLERY_RESULTS_IMAGE_SIZE_LABEL} · ${ADMIN_IMAGE_FORMAT_HINT}`}
              helpText={`Each image must be exactly ${GALLERY_RESULTS_IMAGE_SIZE_LABEL}.`}
            />
            <AdminFormField label="Gallery Type" htmlFor="bulk-gallery-type">
              <select
                id="bulk-gallery-type"
                className="admin-form-control"
                defaultValue="general"
              >
                <option value="general">General</option>
                <option value="events">Events</option>
                <option value="facilities">Facilities</option>
                <option value="activities">Activities</option>
              </select>
            </AdminFormField>
          </form>
        </FormModal>

        <BulkActions
          selectedIds={selectedIds}
          onBulkDelete={handleBulkDelete}
          onBulkActivate={handleBulkActivate}
          onBulkDeactivate={handleBulkDeactivate}
          onClearSelection={() => setSelectedIds([])}
        />
      </div>
    </AdminPageShell>
  )
}
