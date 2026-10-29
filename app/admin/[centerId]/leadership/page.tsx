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
import { useAdminFormValidation } from '@/components/admin/useAdminFormValidation'
import Pagination from '@/components/admin/Pagination'
import PageHeader from '@/components/ui/PageHeader'
import { Input } from '@/components/forms'
import { ADMIN_CONTENT_FORM_RULES } from '@/lib/admin-content-form-rules'
import { adminControlClass } from '@/lib/admin-form-ui'
import ImageUpload from '@/components/admin/ImageUpload'
import { Plus, Edit, Trash2, Users, CheckCircle, XCircle, MessageSquare, Inbox } from 'lucide-react'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

export default function LeadershipManagement({ params }: { params: { centerId: string } }) {
  const [filteredLeaders, setFilteredLeaders] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [messageSaving, setMessageSaving] = useState(false)
  const [sharedMessage, setSharedMessage] = useState({
    message_title: '',
    message_content: ''
  })
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    image_url: '',
    bio: '',
    display_order: 0,
    is_active: true
  })
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, ADMIN_CONTENT_FORM_RULES.leadership)

  const { data: leadersData, loading, error, refetch: fetchLeaders } = useAdminFetch<any[]>(
    `admin-leadership-${params.centerId}`,
    `/api/admin/leadership?centerId=${params.centerId}`,
    { },
  )
  const leaders = leadersData ?? []

useEffect(() => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const filtered = leaders.filter(
        (item) =>
          item.name?.toLowerCase().includes(q) ||
          item.role?.toLowerCase().includes(q)
      )
      setFilteredLeaders(filtered)
    } else {
      setFilteredLeaders(leaders)
    }
    setCurrentPage(1)
  }, [searchQuery, leaders])

  const totalPages = Math.ceil(filteredLeaders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = filteredLeaders.slice(startIndex, endIndex)

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      image_url: '',
      bio: '',
      display_order: 0,
      is_active: true
    })
  }

  const handleSaveSharedMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (leaders.length === 0) {
      toast.info('Add at least one center director first, then save the shared message.')
      return
    }

    try {
      setMessageSaving(true)
      
      const response = await authenticatedFetch('/api/admin/leadership/message', { method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          center_id: parseInt(params.centerId),
          ...sharedMessage })
      })

      if (response.ok) {
        toast.success('Leadership message saved for all directors.')
        fetchLeaders(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save leadership message')
      }
    } catch (error) {
      console.error('Error saving shared message:', error)
      toast.error('Error saving leadership message')
    } finally {
      setMessageSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!validate(formData)) return

    try {
      
      const url = withBasePath(
        editingItem ? `/api/admin/leadership/${editingItem.id}` : '/api/admin/leadership'
      )
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
        fetchLeaders(true)
      } else {
        const error = await response.json()
        setFormError(error.error || 'Failed to save center director')
      }
    } catch (error) {
      console.error('Error saving leadership:', error)
      setFormError('Error saving center director')
    }
  }

  const handleEdit = (item: any) => {
    clearErrors()
    setEditingItem(item)
    setFormData({
      name: item.name || '',
      role: item.role || '',
      image_url: item.image_url || '',
      bio: item.bio || '',
      display_order: item.display_order || 0,
      is_active: item.is_active !== false
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ message: 'Are you sure you want to delete this center director?', destructive: true }))) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/leadership/${id}`, { method: 'DELETE' })

      if (response.ok) {
        fetchLeaders(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete center director')
      }
    } catch (error) {
      console.error('Error deleting leadership:', error)
      toast.error('Error deleting center director')
    }
  }

  const columns: AdminTableColumn<any>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (item) => item.name || '',
      render: (item) => (
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-medium text-[var(--cm-color-text)] truncate">{item.name}</span>
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
      key: 'order',
      header: 'Order',
      hideOnMobile: true,
      width: '4rem',
      sortValue: (item) => Number(item.display_order || 0),
      render: (item) => (
        <span className="text-sm text-[var(--cm-color-text-muted)]">{item.display_order || 0}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (item) => (item.is_active !== false ? 1 : 0),
      render: (item) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            item.is_active !== false
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {item.is_active !== false ? (
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
    <AdminPageShell error={error} onRetry={() => void fetchLeaders(true)}>
      <div className="space-y-6">
        <PageHeader
          title="Leadership"
          description="Manage center directors and the shared director message"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Leadership' },
          ]}
          actions={
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
              Add Center Director
            </button>
          }
        />

        <div className="admin-card space-y-4 p-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-[var(--cm-color-text)]">
              Director&apos;s Message (shared)
            </h2>
          </div>
          <p className="text-sm text-[var(--cm-color-text-muted)]">
            One message from your center directors — shown once on the website above the director
            profiles. Each director has their own photo, name, role, and bio.
          </p>
          <form onSubmit={handleSaveSharedMessage} className="space-y-4">
            <div>
              <label className="admin-form-label">Message Title</label>
              <input
                type="text"
                value={sharedMessage.message_title}
                onChange={(e) => setSharedMessage({ ...sharedMessage, message_title: e.target.value })}
                className="admin-form-control"
              />
            </div>
            <div>
              <label className="admin-form-label">Message Content</label>
              <textarea
                value={sharedMessage.message_content}
                onChange={(e) =>
                  setSharedMessage({ ...sharedMessage, message_content: e.target.value })
                }
                className="admin-form-control"
                rows={4}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={messageSaving}
                className="admin-btn admin-btn--primary admin-btn--sm disabled:opacity-60"
              >
                {messageSaving ? 'Saving...' : 'Save Message'}
              </button>
            </div>
          </form>
        </div>

        <div className="admin-card space-y-4 p-4">
          <div className="max-w-md">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or role..."
              aria-label="Search directors"
            />
          </div>

          <AdminDataTable
            columns={columns}
            rows={paginatedItems}
            rowKey={(item) => item.id}
            loading={loading}
            emptyMessage={
              searchQuery
                ? 'No directors match your search.'
                : 'No center directors yet. Add the first one.'
            }
            emptyIcon={<Inbox className="h-12 w-12" />}
            caption="Center directors"
          />

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredLeaders.length}
              itemsPerPage={itemsPerPage}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingItem(null)
          resetForm()
          clearErrors()
        }}
        title={editingItem ? 'Edit Center Director' : 'Add Center Director'}
        formError={formError}
        footer={
          <FormModalActions
            formId="leadership-form"
            onCancel={() => {
              setIsModalOpen(false)
              setEditingItem(null)
              resetForm()
              clearErrors()
            }}
            submitLabel={editingItem ? 'Update' : 'Create'}
          />
        }
      >
        <form id="leadership-form" onSubmit={handleSubmit} noValidate>
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
                placeholder="Center Director – EduSphere Chennai"
              />
            </AdminFormField>
          </div>
          <ImageUpload
            label="Profile Image"
            value={formData.image_url}
            onChange={(url) => setFormData({ ...formData, image_url: url })}
            folder="leadership"
            centerId={params.centerId}
            helpText="Upload director photo"
          />
          <AdminFormField label="Bio">
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="admin-form-control"
              rows={3}
              placeholder="About this director (optional)"
            />
          </AdminFormField>
          <div className="admin-form-row admin-form-row--2">
            <AdminFormField label="Display Order" className="admin-form-col-6">
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="admin-form-control"
              />
            </AdminFormField>
            <div className="admin-form-col-6">
              <label className="admin-form-label">Status</label>
              <label className="admin-form-check admin-form-check--field">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <span>Active</span>
              </label>
            </div>
          </div>
        </form>
      </FormModal>
    </AdminPageShell>
  )
}
