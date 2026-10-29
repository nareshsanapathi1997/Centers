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
import ImageUpload from '@/components/admin/ImageUpload'
import SafeImage from '@/components/ui/SafeImage'
import { Plus, Edit, Trash2, Users, CheckCircle, XCircle, Upload, Inbox } from 'lucide-react'
import {
  ADMIN_IMAGE_ACCEPT,
  ADMIN_IMAGE_FORMAT_HINT,
  validateAdminImageFiles
} from '@/lib/admin-image-upload-validation'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

export default function SeniorFacultyManagement({ params }: { params: { centerId: string } }) {
  const { data: facultyData, loading, error, refetch: fetchFaculty } = useAdminFetch<any[]>(
    `admin-senior-faculty-${params.centerId}`,
    `/api/admin/senior-faculty?centerId=${params.centerId}`,
  )
  const faculty = facultyData ?? []
  const [filteredFaculty, setFilteredFaculty] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [bulkUploadFiles, setBulkUploadFiles] = useState<File[]>([])
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    description: '',
    image_url: '',
    display_order: 0,
    is_active: true
  })
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, ADMIN_CONTENT_FORM_RULES.seniorFaculty)


  useEffect(() => {
    if (searchQuery) {
      const filtered = faculty.filter(
        (item) =>
          item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredFaculty(filtered)
    } else {
      setFilteredFaculty(faculty)
    }
    setCurrentPage(1)
  }, [searchQuery, faculty])

  const currentItems = filteredFaculty
  const totalPages = Math.ceil(currentItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = currentItems.slice(startIndex, endIndex)

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      description: '',
      image_url: '',
      display_order: 0,
      is_active: true
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!(await confirmDialog({ message: `Are you sure you want to delete ${selectedIds.length} faculty member(s)?`, destructive: true }))) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/senior-faculty/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'delete' })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchFaculty(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete faculty members')
      }
    } catch (error) {
      console.error('Error deleting faculty members:', error)
      toast.error('Error deleting faculty members')
    }
  }

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/senior-faculty/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'status', is_active: true })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchFaculty(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to activate faculty members')
      }
    } catch (error) {
      console.error('Error activating faculty members:', error)
      toast.error('Error activating faculty members')
    }
  }

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/senior-faculty/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'status', is_active: false })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchFaculty(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to deactivate faculty members')
      }
    } catch (error) {
      console.error('Error deactivating faculty members:', error)
      toast.error('Error deactivating faculty members')
    }
  }

  const handleBulkUpload = async (files: File[]) => {
    const formatError = validateAdminImageFiles(files)
    if (formatError) {
      toast.error(formatError)
      return
    }

    try {
      
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('images', file)
      })
      formData.append('center_id', params.centerId)

      const response = await authenticatedFetch('/api/admin/senior-faculty/bulk-upload', { method: 'POST',
                body: formData })

      if (response.ok) {
        setIsBulkUploadOpen(false)
        setBulkUploadFiles([])
        fetchFaculty(true)
        toast.success(`Successfully uploaded ${files.length} faculty member(s)`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to upload faculty members')
      }
    } catch (error) {
      console.error('Error uploading faculty members:', error)
      toast.error('Error uploading faculty members')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!validate(formData)) return

    try {
      
      const url = withBasePath(
        editingItem
          ? `/api/admin/senior-faculty/${editingItem.id}`
          : '/api/admin/senior-faculty'
      )
      const method = editingItem ? 'PATCH' : 'POST'
      const response = await fetch(url, {
        credentials: 'include',
        method,
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          center_id: parseInt(params.centerId),
          ...formData
        })
      })

      if (response.ok) {
        toast.success(editingItem ? 'Senior faculty updated successfully!' : 'Senior faculty added successfully!')
        setIsModalOpen(false)
        resetForm()
        setEditingItem(null)
        fetchFaculty(true)
      } else {
        const error = await response.json()
        setFormError(error.error || 'Failed to save')
      }
    } catch (error) {
      console.error('Error saving senior faculty:', error)
      setFormError('Error saving senior faculty')
    }
  }

  const handleEdit = (item: any) => {
    clearErrors()
    setEditingItem(item)
    setFormData({
      name: item.name || '',
      role: item.role || '',
      description: item.description || '',
      image_url: item.image_url || '',
      display_order: item.display_order || 0,
      is_active: item.is_active !== undefined ? item.is_active : true
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ message: 'Are you sure you want to delete this senior faculty member?', destructive: true }))) {
      return
    }

    try {
      
      const response = await authenticatedFetch(`/api/admin/senior-faculty/${id}`, { method: 'DELETE' })

      if (response.ok) {
        toast.success('Senior faculty deleted successfully!')
        fetchFaculty(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Error deleting senior faculty')
      }
    } catch (error) {
      console.error('Error deleting senior faculty:', error)
      toast.error('Error deleting senior faculty')
    }
  }

  const columns: AdminTableColumn<any>[] = [
    {
      key: 'faculty',
      header: 'Faculty Member',
      sortValue: (item) => item.name || '',
      render: (item) => (
        <div className="flex items-center gap-2 min-w-0">
          {item.image_url ? (
            <SafeImage
              src={item.image_url}
              alt={item.name}
              className="w-9 h-9 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
          )}
          <p className="text-sm font-semibold text-[var(--cm-color-text)] truncate">{item.name}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      hideOnMobile: true,
      sortValue: (item) => item.role || '',
      render: (item) => (
        <span className="text-sm text-[var(--cm-color-text-muted)] truncate">{item.role}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      hideOnMobile: true,
      render: (item) => (
        <span className="text-sm text-[var(--cm-color-text-muted)] truncate">
          {item.description || '-'}
        </span>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      hideOnMobile: true,
      sortValue: (item) => Number(item.display_order || 0),
      render: (item) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          {item.display_order}
        </span>
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
        <div className="flex items-center justify-end gap-1">
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
    <AdminPageShell error={error} onRetry={() => void fetchFaculty(true)}>
      <div className="space-y-6">
        <PageHeader
          title="Senior Faculty"
          description="Manage senior faculty profiles for your center"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Senior Faculty' },
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
                Add New Faculty Member
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
              placeholder="Search by name, role, or description..."
              aria-label="Search senior faculty"
            />
          </div>

          <AdminDataTable
            columns={columns}
            rows={paginatedItems}
            rowKey={(item) => item.id}
            loading={loading}
            emptyMessage={
              searchQuery
                ? 'No senior faculty match your search.'
                : 'No senior faculty found. Create your first senior faculty member.'
            }
            emptyIcon={<Inbox className="h-12 w-12" />}
            caption="Senior faculty"
            selection={{
              selectedKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys.map(Number)),
            }}
          />

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={currentItems.length}
              itemsPerPage={itemsPerPage}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setCurrentPage}
            />
          )}
        </div>

        <FormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            resetForm()
            setEditingItem(null)
            clearErrors()
          }}
          title={editingItem ? 'Edit Senior Faculty Member' : 'Add New Senior Faculty Member'}
          formError={formError}
          footer={
            <FormModalActions
              formId="senior-faculty-form"
              onCancel={() => {
                setIsModalOpen(false)
                resetForm()
                setEditingItem(null)
                clearErrors()
              }}
              submitLabel={editingItem ? 'Update Faculty Member' : 'Save Faculty Member'}
            />
          }
        >
          <form id="senior-faculty-form" onSubmit={handleSubmit} noValidate>
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Name" required error={errors.name} className="admin-form-col-6">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    clearFieldError('name')
                    setFormData({ ...formData, name: e.target.value })
                  }}
                  className={adminControlClass(errors, 'name')}
                  placeholder="e.g., Dr. Ramesh Kumar"
                />
              </AdminFormField>

              <AdminFormField label="Role" required error={errors.role} className="admin-form-col-6">
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => {
                    clearFieldError('role')
                    setFormData({ ...formData, role: e.target.value })
                  }}
                  className={adminControlClass(errors, 'role')}
                  placeholder="e.g., CAT & MBA Entrance Expert"
                />
              </AdminFormField>
            </div>

            <AdminFormField label="Description">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="admin-form-control"
                placeholder="e.g., 15+ years of experience in training students..."
              />
            </AdminFormField>

            <ImageUpload
              label="Image URL"
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
              centerId={params.centerId}
            />

            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Display Order" className="admin-form-col-6">
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="admin-form-control"
                  min="0"
                />
              </AdminFormField>

              <AdminFormField label="Status" className="admin-form-col-6">
                <select
                  value={formData.is_active ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                  className="admin-form-control"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </AdminFormField>
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
          title="Bulk Upload Faculty Members"
          footer={
            <FormModalActions
              formId="senior-faculty-bulk-form"
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
            id="senior-faculty-bulk-form"
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
              formatHint={ADMIN_IMAGE_FORMAT_HINT}
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
