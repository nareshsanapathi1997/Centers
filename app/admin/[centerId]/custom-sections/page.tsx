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
import { Plus, Edit, Trash2, Layers, CheckCircle, XCircle, FileText, Image as ImageIcon, Megaphone, Inbox } from 'lucide-react'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

export default function CustomSectionsManagement({ params }: { params: { centerId: string } }) {
  const [filteredSections, setFilteredSections] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [formData, setFormData] = useState({
    section_type: 'content_block',
    title: '',
    content: '',
    display_order: 0,
    is_active: true
  })
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, ADMIN_CONTENT_FORM_RULES.customSections)

  const { data: sectionsData, loading, error, refetch: fetchSections } = useAdminFetch<any[]>(
    `admin-custom-sections-${params.centerId}`,
    `/api/admin/custom-sections?centerId=${params.centerId}`,
    { },
  )
  const sections = sectionsData ?? []

useEffect(() => {
    if (searchQuery) {
      const filtered = sections.filter(
        (section) =>
          section.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          section.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          section.section_type?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredSections(filtered)
    } else {
      setFilteredSections(sections)
    }
    setCurrentPage(1)
  }, [searchQuery, sections])

  const totalPages = Math.ceil(filteredSections.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSections = filteredSections.slice(startIndex, endIndex)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!validate(formData)) return

    try {
      
      const url = withBasePath(editingSection ? `/api/admin/custom-sections/${editingSection.id}` : '/api/admin/custom-sections')
      const method = editingSection ? 'PATCH' : 'POST'

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
        setEditingSection(null)
        resetForm()
        fetchSections(true)
      } else {
        const error = await response.json()
        setFormError(error.error || 'Failed to save custom section')
      }
    } catch (error) {
      console.error('Error saving section:', error)
      setFormError('Error saving custom section')
    }
  }

  const handleEdit = (section: any) => {
    clearErrors()
    setEditingSection(section)
    setFormData({
      section_type: section.section_type || 'content_block',
      title: section.title || '',
      content: section.content || '',
      display_order: section.display_order || 0,
      is_active: section.is_active !== false
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog('Are you sure?'))) return
    try {
      
      const response = await authenticatedFetch(`/api/admin/custom-sections/${id}`, { method: 'DELETE' })

      if (response.ok) {
        fetchSections(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete custom section')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Error deleting custom section')
    }
  }

  const resetForm = () => {
    setFormData({
      section_type: 'content_block',
      title: '',
      content: '',
      display_order: 0,
      is_active: true
    })
  }

  const getSectionTypeIcon = (type: string) => {
    switch (type) {
      case 'image_slider':
        return <ImageIcon className="w-4 h-4" />
      case 'cta_banner':
        return <Megaphone className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getSectionTypeColors = (type: string) => {
    switch (type) {
      case 'image_slider':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'cta_banner':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      default:
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
    }
  }

  const columns: AdminTableColumn<any>[] = [
    {
      key: 'title',
      header: 'Title',
      sortValue: (section) => section.title || '',
      render: (section) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className={`p-2 rounded-lg ${getSectionTypeColors(section.section_type)}`}>
              {getSectionTypeIcon(section.section_type)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--cm-color-text)] truncate">
              {section.title || 'Untitled'}
            </p>
            {section.content && (
              <p className="text-xs text-[var(--cm-color-text-muted)] truncate mt-1 max-w-md">
                {section.content.substring(0, 60)}...
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
      sortValue: (section) => section.section_type || '',
      render: (section) => (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getSectionTypeColors(section.section_type)}`}>
          {getSectionTypeIcon(section.section_type)}
          <span className="ml-1.5 capitalize">{section.section_type?.replace('_', ' ')}</span>
        </span>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      hideOnMobile: true,
      sortValue: (section) => Number(section.display_order || 0),
      render: (section) => (
        <span className="text-sm text-[var(--cm-color-text-muted)]">{section.display_order || 0}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (section) => (section.is_active ? 1 : 0),
      render: (section) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            section.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {section.is_active ? (
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
      render: (section) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Edit"
            onClick={() => handleEdit(section)}
            className="admin-btn admin-btn--icon admin-btn--icon-edit"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={() => void handleDelete(section.id)}
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
    <AdminPageShell error={error} onRetry={() => void fetchSections(true)}>
      <div className="space-y-6">
        <PageHeader
          title="Custom Sections"
          description="Manage custom content sections on your website"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Custom Sections' },
          ]}
          actions={
            <button
              type="button"
              onClick={() => {
                resetForm()
                clearErrors()
                setEditingSection(null)
                setIsModalOpen(true)
              }}
              className="admin-btn admin-btn--primary admin-btn--md whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Add New Section
            </button>
          }
        />

        <div className="admin-card space-y-4 p-4">
          <div className="max-w-md">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, content, or type..."
              aria-label="Search custom sections"
            />
          </div>

          <AdminDataTable
            columns={columns}
            rows={paginatedSections}
            rowKey={(section) => section.id}
            loading={loading}
            emptyMessage={
              searchQuery
                ? 'No custom sections match your search.'
                : 'No custom sections found. Create your first custom section.'
            }
            emptyIcon={<Inbox className="h-12 w-12" />}
            caption="Custom sections"
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredSections.length}
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
            setEditingSection(null)
            resetForm()
            clearErrors()
          }}
          title={editingSection ? 'Edit Custom Section' : 'Add Custom Section'}
          formError={formError}
          footer={
            <FormModalActions
              formId="custom-section-form"
              onCancel={() => {
                setIsModalOpen(false)
                setEditingSection(null)
                resetForm()
                clearErrors()
              }}
              submitLabel={editingSection ? 'Update Section' : 'Create Section'}
            />
          }
        >
          <form id="custom-section-form" onSubmit={handleSubmit} noValidate>
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Section Type" required error={errors.section_type} className="admin-form-col-6">
                <select
                  value={formData.section_type}
                  onChange={(e) => {
                    clearFieldError('section_type')
                    setFormData({ ...formData, section_type: e.target.value })
                  }}
                  className={adminControlClass(errors, 'section_type')}
                >
                  <option value="content_block">Content Block</option>
                  <option value="image_slider">Image Slider</option>
                  <option value="cta_banner">CTA Banner</option>
                </select>
              </AdminFormField>
              <AdminFormField label="Title" className="admin-form-col-6">
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="admin-form-control"
                  placeholder="Enter section title"
                />
              </AdminFormField>
            </div>
            <AdminFormField label="Content">
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="admin-form-control"
                rows={6}
                placeholder="Enter section content"
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
      </div>
    </AdminPageShell>
  )
}
