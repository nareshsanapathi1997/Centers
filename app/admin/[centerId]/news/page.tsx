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
import BulkActions from '@/components/admin/BulkActions'
import RichTextEditor from '@/components/admin/RichTextEditor'
import PageHeader from '@/components/ui/PageHeader'
import { Input } from '@/components/forms'
import { ADMIN_CONTENT_FORM_RULES } from '@/lib/admin-content-form-rules'
import { adminControlClass } from '@/lib/admin-form-ui'
import { Plus, Edit, Trash2, Bell, FileText, CheckCircle, XCircle, ChevronLeft, ChevronRight, Clock, CheckCircle2, Inbox } from 'lucide-react'
import { useApprovalSectionSettings } from '@/lib/use-approval-section-settings'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

export default function NewsManagement({ params }: { params: { centerId: string } }) {
  const { isApprovalEnabled } = useApprovalSectionSettings(params.centerId)
  const newsApprovalEnabled = isApprovalEnabled('news')
  const [filteredItems, setFilteredItems] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    link_url: '',
    is_new: false,
    is_notification: false,
    display_order: 0,
    is_active: true
  })
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, ADMIN_CONTENT_FORM_RULES.news)

  const { data: itemsData, loading, error, refetch: fetchItems } = useAdminFetch<any[]>(
    `admin-news-${params.centerId}`,
    `/api/admin/news?centerId=${params.centerId}`,
  )
  const items = itemsData ?? []

  useEffect(() => {
    if (searchQuery) {
      const filtered = items.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredItems(filtered)
    } else {
      setFilteredItems(items)
    }
    setCurrentPage(1) // Reset to first page when search changes
  }, [searchQuery, items])

  // Calculate pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!validate(formData)) return

    try {
      
      const url = withBasePath(editingItem ? `/api/admin/news/${editingItem.id}` : '/api/admin/news')
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
        setFormError(error.error || 'Failed to save news item')
      }
    } catch (error) {
      console.error('Error saving item:', error)
      setFormError('Error saving news item')
    }
  }

  const handleEdit = (item: any) => {
    clearErrors()
    setEditingItem(item)
    setFormData({
      title: item.title || '',
      content: item.content || '',
      link_url: item.link_url || '',
      is_new: item.is_new || false,
      is_notification: item.is_notification || false,
      display_order: item.display_order || 0,
      is_active: item.is_active !== false
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog('Are you sure?'))) return
    try {
      
      const response = await authenticatedFetch(`/api/admin/news/${id}`, { method: 'DELETE' })

      if (response.ok) {
        fetchItems(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete news item')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Error deleting news item')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      link_url: '',
      is_new: false,
      is_notification: false,
      display_order: 0,
      is_active: true
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!(await confirmDialog({ message: `Are you sure you want to delete ${selectedIds.length} item(s)?`, destructive: true }))) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/news/bulk?centerId=${params.centerId}`, { method: 'POST',
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
      
      const response = await authenticatedFetch(`/api/admin/news/bulk?centerId=${params.centerId}`, { method: 'POST',
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
      
      const response = await authenticatedFetch(`/api/admin/news/bulk?centerId=${params.centerId}`, { method: 'POST',
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

  const columns: AdminTableColumn<any>[] = [
    {
      key: 'title',
      header: 'Title',
      sortValue: (item) => item.title || '',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {item.is_notification ? (
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            ) : (
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--cm-color-text)] truncate">
              {item.title || 'Untitled'}
            </p>
            {item.content && (
              <p className="text-xs text-[var(--cm-color-text-muted)] truncate mt-1">
                {item.content.substring(0, 60)}...
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      hideOnMobile: true,
      sortValue: (item) => (item.is_notification ? 1 : 0),
      render: (item) => (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              item.is_notification
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
            }`}
          >
            {item.is_notification ? (
              <>
                <Bell className="w-3 h-3 mr-1" />
                Notification
              </>
            ) : (
              <>
                <FileText className="w-3 h-3 mr-1" />
                News
              </>
            )}
          </span>
          {item.is_new && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              New
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (item) => (item.is_active ? 1 : 0),
      render: (item) => (
        <div className="flex flex-col gap-2">
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
          {newsApprovalEnabled && item.approval_status && (
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                item.approval_status === 'approved'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : item.approval_status === 'rejected'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}
            >
              {item.approval_status === 'approved' ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Approved
                </>
              ) : item.approval_status === 'rejected' ? (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Rejected
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 mr-1" />
                  Pending
                </>
              )}
            </span>
          )}
        </div>
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
          title="News & Notifications"
          description="Manage news items and notifications for your center"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'News' },
          ]}
          actions={
            <button
              type="button"
              onClick={() => {
                resetForm()
                setEditingItem(null)
                setIsModalOpen(true)
              }}
              className="admin-btn admin-btn--primary admin-btn--md whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Add New Item
            </button>
          }
        />

        <div className="admin-card space-y-4 p-4">
          <div className="max-w-md">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or content..."
              aria-label="Search news"
            />
          </div>

          <AdminDataTable
            columns={columns}
            rows={paginatedItems}
            rowKey={(item) => item.id}
            loading={loading}
            emptyMessage={
              searchQuery ? 'No items match your search.' : 'No items found. Create your first news item.'
            }
            emptyIcon={<Inbox className="h-12 w-12" />}
            caption="News and notifications"
            selection={{
              selectedKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys.map(Number)),
            }}
          />

          {filteredItems.length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--cm-color-border)] pt-4">
              <div className="text-sm text-[var(--cm-color-text-muted)]">
                Showing <span className="font-semibold text-[var(--cm-color-text)]">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-[var(--cm-color-text)]">
                  {Math.min(endIndex, filteredItems.length)}
                </span>{' '}
                of <span className="font-semibold text-[var(--cm-color-text)]">{filteredItems.length}</span>{' '}
                results
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    currentPage === 1
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          type="button"
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                            currentPage === page
                              ? 'admin-btn admin-btn--primary admin-btn--active'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-2 text-[var(--cm-color-text-muted)]">
                          ...
                        </span>
                      )
                    }
                    return null
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    currentPage === totalPages
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        onBulkDelete={handleBulkDelete}
        onBulkActivate={handleBulkActivate}
        onBulkDeactivate={handleBulkDeactivate}
        onClearSelection={() => setSelectedIds([])}
      />

      <FormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingItem(null)
          resetForm()
          clearErrors()
        }}
        title={editingItem ? 'Edit Item' : 'Add Item'}
        size="large"
        formError={formError}
        footer={
          <FormModalActions
            formId="news-item-form"
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
        <form id="news-item-form" onSubmit={handleSubmit} noValidate>
          <AdminFormField label="Title" required error={errors.title}>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                clearFieldError('title')
                setFormData({ ...formData, title: e.target.value })
              }}
              className={adminControlClass(errors, 'title')}
              placeholder="Enter news title"
            />
          </AdminFormField>
          <AdminFormField label="Content (rich text or HTML)">
            <RichTextEditor
              value={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
              placeholder="Enter news or notification content. Use the toolbar for formatting or paste HTML."
            />
          </AdminFormField>
          <div className="admin-form-row admin-form-row--2">
            <AdminFormField label="Link URL" error={errors.link_url} className="admin-form-col-6">
              <input
                type="text"
                value={formData.link_url}
                onChange={(e) => {
                  clearFieldError('link_url')
                  setFormData({ ...formData, link_url: e.target.value })
                }}
                className={adminControlClass(errors, 'link_url')}
                placeholder="https://example.com"
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
          <div className="admin-form-checkgroup admin-form-checkgroup--3">
            <label className="admin-form-check">
              <input
                type="checkbox"
                checked={formData.is_new}
                onChange={(e) => setFormData({ ...formData, is_new: e.target.checked })}
              />
              <span>Mark as New</span>
            </label>
            <label className="admin-form-check">
              <input
                type="checkbox"
                checked={formData.is_notification}
                onChange={(e) => setFormData({ ...formData, is_notification: e.target.checked })}
              />
              <span>Is Notification</span>
            </label>
            <label className="admin-form-check">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span>Active</span>
            </label>
          </div>
        </form>
      </FormModal>
    </AdminPageShell>
  )
}

