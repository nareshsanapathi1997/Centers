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
import { Input, Switch } from '@/components/forms'
import { Plus, Edit, Trash2, Sliders, CheckCircle, XCircle, ImagePlus, Inbox } from 'lucide-react'
import ImageUpload from '@/components/admin/ImageUpload'
import {
  HERO_BANNER_IMAGE_HEIGHT,
  HERO_BANNER_IMAGE_WIDTH,
  HERO_BANNER_IMAGE_SIZE_LABEL
} from '@/lib/hero-banner-image-spec'
import { useApprovalSectionSettings } from '@/lib/use-approval-section-settings'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

export default function HeroManagement({ params }: { params: { centerId: string } }) {
  const { isApprovalEnabled } = useApprovalSectionSettings(params.centerId)
  const heroApprovalEnabled = isApprovalEnabled('hero')
  const { data: slidesData, loading, error, refetch: fetchSlides } = useAdminFetch<any[]>(
    `admin-hero-${params.centerId}`,
    `/api/admin/hero?centerId=${params.centerId}`,
  )
  const slides = slidesData ?? []
  const [filteredSlides, setFilteredSlides] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSlide, setEditingSlide] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [formData, setFormData] = useState({
    title: '',
    slider_image_url: '',
    button_link: '',
    display_order: 0,
    is_active: true
  })
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, {
      title: [{ type: 'required', message: 'Title is required.' }],
      slider_image_url: [{ type: 'required', message: 'Banner image is required.' }],
      button_link: [{ type: 'url', optional: true, message: 'Enter a valid URL (http or https).' }]
    })


  useEffect(() => {
    if (searchQuery) {
      const filtered = slides.filter(
        (slide) =>
          slide.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          slide.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          slide.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredSlides(filtered)
    } else {
      setFilteredSlides(slides)
    }
    setCurrentPage(1)
  }, [searchQuery, slides])

  const totalPages = Math.ceil(filteredSlides.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSlides = filteredSlides.slice(startIndex, endIndex)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()

    if (!validate(formData)) return

    try {
      
      const url = withBasePath(editingSlide ? `/api/admin/hero/${editingSlide.id}` : '/api/admin/hero')
      const method = editingSlide ? 'PATCH' : 'POST'

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
        setEditingSlide(null)
        resetForm()
        fetchSlides(true)
      } else {
        const error = await response.json()
        setFormError(error.error || 'Failed to save hero slide')
      }
    } catch (error) {
      console.error('Error saving slide:', error)
      setFormError('Error saving hero slide')
    }
  }

  const handleEdit = (slide: any) => {
    clearErrors()
    setEditingSlide(slide)
    setFormData({
      title: slide.title || '',
      slider_image_url: slide.slider_image_url || '',
      button_link: slide.button_link || '',
      display_order: slide.display_order || 0,
      is_active: slide.is_active !== false
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ message: 'Are you sure you want to delete this slide?', destructive: true }))) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/hero/${id}`, { method: 'DELETE' })

      if (response.ok) {
        fetchSlides(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete hero slide')
      }
    } catch (error) {
      console.error('Error deleting slide:', error)
      toast.error('Error deleting hero slide')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      slider_image_url: '',
      button_link: '',
      display_order: 0,
      is_active: true
    })
  }

  const columns: AdminTableColumn<any>[] = [
    {
      key: 'title',
      header: 'Title',
      sortValue: (slide) => slide.title || '',
      render: (slide) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-lg">
              <ImagePlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--cm-color-text)] truncate">
              {slide.title || 'Untitled'}
            </p>
            {slide.subtitle && (
              <p className="text-xs text-[var(--cm-color-text-muted)] truncate mt-1">{slide.subtitle}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      hideOnMobile: true,
      render: () => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
          <ImagePlus className="w-3 h-3 mr-1" />
          Banner
        </span>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      hideOnMobile: true,
      sortValue: (slide) => Number(slide.display_order || 0),
      render: (slide) => (
        <span className="text-sm text-[var(--cm-color-text-muted)]">{slide.display_order || 0}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (slide) => (slide.is_active ? 1 : 0),
      render: (slide) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            slide.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {slide.is_active ? (
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
    ...(heroApprovalEnabled
      ? [
          {
            key: 'approval',
            header: 'Approval',
            hideOnMobile: true,
            sortValue: (slide: any) => slide.approval_status || 'pending',
            render: (slide: any) => (
              <>
                {slide.approval_status === 'approved' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Approved
                  </span>
                )}
                {slide.approval_status === 'rejected' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <XCircle className="w-3 h-3 mr-1" />
                    Rejected
                  </span>
                )}
                {(slide.approval_status === 'pending' || !slide.approval_status) && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    Pending
                  </span>
                )}
              </>
            ),
          } as AdminTableColumn<any>,
        ]
      : []),
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (slide) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Edit"
            onClick={() => handleEdit(slide)}
            className="admin-btn admin-btn--icon admin-btn--icon-edit"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={() => void handleDelete(slide.id)}
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
    <AdminPageShell error={error} onRetry={() => void fetchSlides(true)}>
      <div className="space-y-6">
        <PageHeader
          title="Hero Banners"
          description="Manage homepage hero banner slides"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Hero' },
          ]}
          actions={
            <button
              type="button"
              onClick={() => {
                resetForm()
                clearErrors()
                setEditingSlide(null)
                setIsModalOpen(true)
              }}
              className="admin-btn admin-btn--primary admin-btn--md whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Add New Slide
            </button>
          }
        />

        <div className="admin-card space-y-4 p-4">
          <div className="max-w-md">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, subtitle, or description..."
              aria-label="Search hero slides"
            />
          </div>

          <AdminDataTable
            columns={columns}
            rows={paginatedSlides}
            rowKey={(slide) => slide.id}
            loading={loading}
            emptyMessage={
              searchQuery
                ? 'No slides match your search.'
                : 'No slides found. Create your first hero slide.'
            }
            emptyIcon={<Inbox className="h-12 w-12" />}
            caption="Hero slides"
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredSlides.length}
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
            setEditingSlide(null)
            resetForm()
            clearErrors()
          }}
          title={editingSlide ? 'Edit Hero Slide' : 'Add Hero Slide'}
          formError={formError}
          footer={
            <FormModalActions
              formId="hero-slide-form"
              onCancel={() => {
                setIsModalOpen(false)
                setEditingSlide(null)
                resetForm()
                clearErrors()
              }}
              submitLabel={editingSlide ? 'Update Slide' : 'Create Slide'}
            />
          }
        >
          <form id="hero-slide-form" onSubmit={handleSubmit} noValidate>
            <AdminFormField label="Title" required hint="For admin reference only" error={errors.title}>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => {
                  clearFieldError('title')
                  setFormData({ ...formData, title: e.target.value })
                }}
                className={`admin-form-control${errors.title ? ' admin-form-control--invalid' : ''}`}
                placeholder="Enter slide title (e.g., Summer Course Banner)"
              />
            </AdminFormField>

            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Banner Image" required error={errors.slider_image_url} className="admin-form-col-6">
                <ImageUpload
                  label=""
                  value={formData.slider_image_url}
                  onChange={(url) => {
                    clearFieldError('slider_image_url')
                    setFormData({ ...formData, slider_image_url: url })
                  }}
                  folder="hero"
                  centerId={params.centerId}
                  minWidth={HERO_BANNER_IMAGE_WIDTH}
                  minHeight={HERO_BANNER_IMAGE_HEIGHT}
                  maxWidth={HERO_BANNER_IMAGE_WIDTH}
                  maxHeight={HERO_BANNER_IMAGE_HEIGHT}
                  helpText={`Required size: ${HERO_BANNER_IMAGE_SIZE_LABEL}`}
                />
              </AdminFormField>

              <AdminFormField label="Banner Link (Optional)" error={errors.button_link} className="admin-form-col-6">
                <input
                  type="text"
                  value={formData.button_link}
                  onChange={(e) => {
                    clearFieldError('button_link')
                    setFormData({ ...formData, button_link: e.target.value })
                  }}
                  className={`admin-form-control${errors.button_link ? ' admin-form-control--invalid' : ''}`}
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
                <Switch
                  id="is_active"
                  label="Active"
                  hint="Inactive slides are hidden on the website"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
          </form>
        </FormModal>
      </div>
    </AdminPageShell>
  )
}
