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
import { Plus, Edit, Trash2, Sliders, ExternalLink, CheckCircle, XCircle, Inbox } from 'lucide-react'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

export default function CTASlidersManagement({ params }: { params: { centerId: string } }) {
  const [filteredSliders, setFilteredSliders] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSlider, setEditingSlider] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [formData, setFormData] = useState({
    text: '',
    link_url: '',
    display_order: 0,
    is_active: true
  })
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, ADMIN_CONTENT_FORM_RULES.ctaSliders)

  const { data: slidersData, loading, error, refetch: fetchSliders } = useAdminFetch<any[]>(
    `admin-cta-sliders-${params.centerId}`,
    `/api/admin/cta-sliders?centerId=${params.centerId}`,
    { },
  )
  const sliders = slidersData ?? []

useEffect(() => {
    if (searchQuery) {
      const filtered = sliders.filter(
        (slider) =>
          slider.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          slider.link_url?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredSliders(filtered)
    } else {
      setFilteredSliders(sliders)
    }
    setCurrentPage(1)
  }, [searchQuery, sliders])

  const totalPages = Math.ceil(filteredSliders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSliders = filteredSliders.slice(startIndex, endIndex)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!validate(formData)) return

    try {
      
      const url = withBasePath(editingSlider ? `/api/admin/cta-sliders/${editingSlider.id}` : '/api/admin/cta-sliders')
      const method = editingSlider ? 'PATCH' : 'POST'

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
        setEditingSlider(null)
        resetForm()
        fetchSliders(true)
      } else {
        const error = await response.json()
        setFormError(error.error || 'Failed to save CTA slider')
      }
    } catch (error) {
      console.error('Error saving slider:', error)
      setFormError('Error saving CTA slider')
    }
  }

  const handleEdit = (slider: any) => {
    clearErrors()
    setEditingSlider(slider)
    setFormData({
      text: slider.text || '',
      link_url: slider.link_url || '',
      display_order: slider.display_order || 0,
      is_active: slider.is_active !== false
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog('Are you sure?'))) return
    try {
      
      const response = await authenticatedFetch(`/api/admin/cta-sliders/${id}`, { method: 'DELETE' })

      if (response.ok) {
        fetchSliders(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete CTA slider')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Error deleting CTA slider')
    }
  }

  const resetForm = () => {
    setFormData({
      text: '',
      link_url: '',
      display_order: 0,
      is_active: true
    })
  }

  const columns: AdminTableColumn<any>[] = [
    {
      key: 'text',
      header: 'Text',
      sortValue: (slider) => slider.text || '',
      render: (slider) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--cm-color-text)] truncate">
              {slider.text || 'Untitled'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'link',
      header: 'Link',
      hideOnMobile: true,
      sortValue: (slider) => slider.link_url || '',
      render: (slider) =>
        slider.link_url ? (
          <a
            href={slider.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="truncate max-w-xs">{slider.link_url}</span>
          </a>
        ) : (
          <span className="text-sm text-[var(--cm-color-text-muted)]">—</span>
        ),
    },
    {
      key: 'order',
      header: 'Order',
      hideOnMobile: true,
      sortValue: (slider) => Number(slider.display_order || 0),
      render: (slider) => (
        <span className="text-sm text-[var(--cm-color-text-muted)]">{slider.display_order || 0}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (slider) => (slider.is_active ? 1 : 0),
      render: (slider) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            slider.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {slider.is_active ? (
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
      render: (slider) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Edit"
            onClick={() => handleEdit(slider)}
            className="admin-btn admin-btn--icon admin-btn--icon-edit"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={() => void handleDelete(slider.id)}
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
    <AdminPageShell error={error} onRetry={() => void fetchSliders(true)}>
      <div className="space-y-6">
        <PageHeader
          title="CTA Sliders"
          description="Manage call-to-action slider items for your center"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'CTA Sliders' },
          ]}
          actions={
            <button
              type="button"
              onClick={() => {
                resetForm()
                clearErrors()
                setEditingSlider(null)
                setIsModalOpen(true)
              }}
              className="admin-btn admin-btn--primary admin-btn--md whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Add New Slider
            </button>
          }
        />

        <div className="admin-card space-y-4 p-4">
          <div className="max-w-md">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by text or link..."
              aria-label="Search CTA sliders"
            />
          </div>

          <AdminDataTable
            columns={columns}
            rows={paginatedSliders}
            rowKey={(slider) => slider.id}
            loading={loading}
            emptyMessage={
              searchQuery
                ? 'No sliders match your search.'
                : 'No sliders found. Create your first CTA slider.'
            }
            emptyIcon={<Inbox className="h-12 w-12" />}
            caption="CTA sliders"
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredSliders.length}
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
            setEditingSlider(null)
            resetForm()
            clearErrors()
          }}
          title={editingSlider ? 'Edit CTA Slider' : 'Add CTA Slider'}
          formError={formError}
          footer={
            <FormModalActions
              formId="cta-slider-form"
              onCancel={() => {
                setIsModalOpen(false)
                setEditingSlider(null)
                resetForm()
                clearErrors()
              }}
              submitLabel={editingSlider ? 'Update Slider' : 'Create Slider'}
            />
          }
        >
          <form id="cta-slider-form" onSubmit={handleSubmit} noValidate>
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Text" required error={errors.text} className="admin-form-col-6">
                <input
                  type="text"
                  value={formData.text}
                  onChange={(e) => {
                    clearFieldError('text')
                    setFormData({ ...formData, text: e.target.value })
                  }}
                  className={adminControlClass(errors, 'text')}
                  placeholder="Enter slider text"
                />
              </AdminFormField>
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
            </div>
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
      </div>
    </AdminPageShell>
  )
}
