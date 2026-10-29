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
import { Plus, Edit, Trash2, Award, Image as ImageIcon, CheckCircle, XCircle, Upload, Inbox } from 'lucide-react'
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

export default function ResultsManagement({ params }: { params: { centerId: string } }) {
  const [filteredResults, setFilteredResults] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingResult, setEditingResult] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [bulkUploadFiles, setBulkUploadFiles] = useState<File[]>([])
  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    display_order: 0,
    is_active: true
  })
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, ADMIN_CONTENT_FORM_RULES.results)

  const { data: resultsData, loading, error, refetch: fetchResults } = useAdminFetch<any[]>(
    `admin-results-${params.centerId}`,
    `/api/admin/results?centerId=${params.centerId}`,
  )
  const results = resultsData ?? []

  useEffect(() => {
    if (searchQuery) {
      const filtered = results.filter(
        (result) => result.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredResults(filtered)
    } else {
      setFilteredResults(results)
    }
    setCurrentPage(1)
  }, [searchQuery, results])

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedResults = filteredResults.slice(startIndex, endIndex)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!validate(formData)) return

    try {
      const url = withBasePath(editingResult ? `/api/admin/results/${editingResult.id}` : '/api/admin/results')
      const method = editingResult ? 'PATCH' : 'POST'
      
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
        setEditingResult(null)
        resetForm()
        fetchResults(true)
      } else {
        const error = await response.json()
        setFormError(error.error || 'Failed to save result')
      }
    } catch (error) {
      console.error('Error saving result:', error)
      setFormError('Error saving result')
    }
  }

  const handleEdit = (result: any) => {
    clearErrors()
    setEditingResult(result)
    setFormData({
      title: result.title || '',
      image_url: result.image_url || '',
      display_order: result.display_order || 0,
      is_active: result.is_active !== false
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog('Are you sure?'))) return
    try {
      
      const response = await authenticatedFetch(`/api/admin/results/${id}`, { method: 'DELETE' })

      if (response.ok) {
        fetchResults(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete result')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Error deleting result')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      image_url: '',
      display_order: 0,
      is_active: true
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!(await confirmDialog({ message: `Are you sure you want to delete ${selectedIds.length} result(s)?`, destructive: true }))) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/results/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'delete' })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchResults(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete results')
      }
    } catch (error) {
      console.error('Error deleting results:', error)
      toast.error('Error deleting results')
    }
  }

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/results/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'status', is_active: true })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchResults(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to activate results')
      }
    } catch (error) {
      console.error('Error activating results:', error)
      toast.error('Error activating results')
    }
  }

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/results/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'status', is_active: false })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchResults(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to deactivate results')
      }
    } catch (error) {
      console.error('Error deactivating results:', error)
      toast.error('Error deactivating results')
    }
  }

  const handleBulkUpload = async (files: File[]) => {
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
      formData.append('center_id', params.centerId)

      const response = await authenticatedFetch('/api/admin/results/bulk-upload', { method: 'POST',
                body: formData })

      if (response.ok) {
        setIsBulkUploadOpen(false)
        setBulkUploadFiles([])
        fetchResults(true)
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

  const columns: AdminTableColumn<any>[] = [
    {
      key: 'title',
      header: 'Title',
      sortValue: (result) => result.title || '',
      render: (result) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Award className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--cm-color-text)] truncate">
              {result.title || 'Untitled'}
            </p>
            {result.display_order !== undefined && (
              <p className="text-xs text-[var(--cm-color-text-muted)] mt-1">Order: {result.display_order}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'image',
      header: 'Image',
      hideOnMobile: true,
      render: (result) =>
        result.image_url ? (
          <div className="flex items-center">
            <SafeImage
              src={result.image_url}
              alt={result.title || 'Result image'}
              className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-sm"
            />
          </div>
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
      sortValue: (result) => (result.is_active ? 1 : 0),
      render: (result) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            result.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {result.is_active ? (
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
      render: (result) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Edit"
            onClick={() => handleEdit(result)}
            className="admin-btn admin-btn--icon admin-btn--icon-edit"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={() => void handleDelete(result.id)}
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
    <AdminPageShell error={error} onRetry={() => void fetchResults(true)}>
      <div className="space-y-6">
        <PageHeader
          title="Results"
          description="Manage exam and achievement result images"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Results' },
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
                  setEditingResult(null)
                  setIsModalOpen(true)
                }}
                className="admin-btn admin-btn--primary admin-btn--md whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                Add New Result
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
              placeholder="Search by title..."
              aria-label="Search results"
            />
          </div>

          <AdminDataTable
            columns={columns}
            rows={paginatedResults}
            rowKey={(result) => result.id}
            loading={loading}
            emptyMessage={
              searchQuery
                ? 'No results match your search.'
                : 'No results found. Create your first result.'
            }
            emptyIcon={<Inbox className="h-12 w-12" />}
            caption="Results"
            selection={{
              selectedKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys.map(Number)),
            }}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredResults.length}
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
            setEditingResult(null)
            resetForm()
            clearErrors()
          }}
          title={editingResult ? 'Edit Result' : 'Add Result'}
          formError={formError}
          footer={
            <FormModalActions
              formId="result-form"
              onCancel={() => {
                setIsModalOpen(false)
                setEditingResult(null)
                resetForm()
                clearErrors()
              }}
              submitLabel={editingResult ? 'Update Result' : 'Create Result'}
            />
          }
        >
          <form id="result-form" onSubmit={handleSubmit} noValidate>
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
                  placeholder="Enter result title"
                />
              </AdminFormField>
              <AdminFormField label="Display Order" className="admin-form-col-6">
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="admin-form-control"
                  placeholder="0"
                />
              </AdminFormField>
            </div>
            <AdminFormField label="Result Image" required error={errors.image_url}>
              <ImageUpload
                label=""
                value={formData.image_url}
                onChange={(url) => {
                  clearFieldError('image_url')
                  setFormData({ ...formData, image_url: url })
                }}
                folder="results"
                centerId={params.centerId}
                minWidth={GALLERY_RESULTS_IMAGE_WIDTH}
                minHeight={GALLERY_RESULTS_IMAGE_HEIGHT}
                maxWidth={GALLERY_RESULTS_IMAGE_WIDTH}
                maxHeight={GALLERY_RESULTS_IMAGE_HEIGHT}
                helpText={`Upload a ${GALLERY_RESULTS_IMAGE_SIZE_LABEL} image (16:9).`}
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
          </form>
        </FormModal>

        {/* Bulk Upload Modal */}
        <FormModal
          isOpen={isBulkUploadOpen}
          onClose={() => {
            setIsBulkUploadOpen(false)
            setBulkUploadFiles([])
          }}
          title="Bulk Upload Result Images"
          footer={
            <FormModalActions
              formId="results-bulk-upload-form"
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
            id="results-bulk-upload-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (bulkUploadFiles.length === 0) {
                toast.error('Please select at least one image')
                return
              }
              handleBulkUpload(bulkUploadFiles)
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
