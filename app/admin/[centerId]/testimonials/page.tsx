'use client'
import { withBasePath } from '@/lib/with-base-path'
import { authenticatedFetch } from '@/lib/admin-api'

import { useEffect, useMemo, useState } from 'react'
import { useAdminFetch } from '@/lib/use-admin-fetch'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import AdminFormField from '@/components/admin/AdminFormField'
import { useAdminFormValidation } from '@/components/admin/useAdminFormValidation'
import Pagination from '@/components/admin/Pagination'
import BulkActions from '@/components/admin/BulkActions'
import PageHeader from '@/components/ui/PageHeader'
import { Input } from '@/components/forms'
import { ADMIN_CONTENT_FORM_RULES } from '@/lib/admin-content-form-rules'
import { adminControlClass } from '@/lib/admin-form-ui'
import { Plus, Edit, Trash2, MessageSquare, Video, FileText, CheckCircle, XCircle, Inbox } from 'lucide-react'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

export default function TestimonialsManagement({ params }: { params: { centerId: string } }) {
  const [activeTab, setActiveTab] = useState<'text' | 'video'>('text')
  const [filteredText, setFilteredText] = useState<any[]>([])
  const [filteredVideo, setFilteredVideo] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [formData, setFormData] = useState({
    quote: '',
    author_name: '',
    author_role: '',
    title: '',
    video_url: '',
    display_order: 0,
    is_active: true
  })
  const formRules = useMemo(
    () =>
      activeTab === 'text'
        ? ADMIN_CONTENT_FORM_RULES.testimonialsText
        : ADMIN_CONTENT_FORM_RULES.testimonialsVideo,
    [activeTab]
  )
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, formRules)

  const { data: textData, loading: textLoading, refetch: refetchText } = useAdminFetch<any[]>(
    `admin-testimonials-text-${params.centerId}`,
    `/api/admin/testimonials/text?centerId=${params.centerId}`,
  )
  const { data: videoData, loading: videoLoading, refetch: refetchVideo } = useAdminFetch<any[]>(
    `admin-testimonials-video-${params.centerId}`,
    `/api/admin/testimonials/video?centerId=${params.centerId}`,
  )
  const textTestimonials = textData ?? []
  const videoTestimonials = videoData ?? []
  const loading = textLoading || videoLoading

  const fetchTestimonials = () => {
    void refetchText(true)
    void refetchVideo(true)
  }

  useEffect(() => {
    if (searchQuery) {
      if (activeTab === 'text') {
        const filtered = textTestimonials.filter(
          (item) =>
            item.author_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.quote?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.author_role?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        setFilteredText(filtered)
      } else {
        const filtered = videoTestimonials.filter(
          (item) =>
            item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.video_url?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        setFilteredVideo(filtered)
      }
    } else {
      setFilteredText(textTestimonials)
      setFilteredVideo(videoTestimonials)
    }
    setCurrentPage(1)
  }, [searchQuery, textTestimonials, videoTestimonials, activeTab])

  const currentItems = activeTab === 'text' ? filteredText : filteredVideo
  const totalPages = Math.ceil(currentItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = currentItems.slice(startIndex, endIndex)

  // Helper function to convert YouTube URL to embed URL
  const convertToEmbedUrl = (url: string): string => {
    if (!url) return url
    
    // If already an embed URL, return as is
    if (url.includes('youtube.com/embed/')) {
      return url
    }
    
    // Convert youtu.be short URL
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0]
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
    }
    
    // Convert regular YouTube URL
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('watch?v=')[1]?.split('&')[0]
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
    }
    
    // If it doesn't match any pattern, return as is (might be already correct)
    return url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!validate(formData)) return

    try {
      
      let response
      if (activeTab === 'text') {
        const url = withBasePath(editingItem ? `/api/admin/testimonials/text/${editingItem.id}` : '/api/admin/testimonials/text')
        const method = editingItem ? 'PATCH' : 'POST'
        response = await fetch(url, {
        credentials: 'include',
          method,
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            center_id: parseInt(params.centerId),
            quote: formData.quote,
            author_name: formData.author_name,
            author_role: formData.author_role,
            display_order: formData.display_order,
            is_active: formData.is_active
          })
        })
      } else {
        const url = withBasePath(editingItem ? `/api/admin/testimonials/video/${editingItem.id}` : '/api/admin/testimonials/video')
        const method = editingItem ? 'PATCH' : 'POST'
        
        // Convert video URL to embed format
        const embedUrl = convertToEmbedUrl(formData.video_url)
        
        response = await fetch(url, {
        credentials: 'include',
          method,
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            center_id: parseInt(params.centerId),
            title: formData.title,
            video_url: embedUrl,
            display_order: editingItem ? formData.display_order : 0, // Default to 0 for new items
            is_active: editingItem ? formData.is_active : true, // Default to true for new items
          })
        })
      }

      if (response.ok) {
        setIsModalOpen(false)
        setEditingItem(null)
        resetForm()
        fetchTestimonials()
      } else {
        const error = await response.json()
        setFormError(error.error || 'Failed to save testimonial')
      }
    } catch (error) {
      console.error('Error saving:', error)
      setFormError('Error saving testimonial')
    }
  }

  const handleEdit = (item: any, type: 'text' | 'video') => {
    clearErrors()
    setEditingItem(item)
    if (type === 'text') {
      setFormData({
        quote: item.quote || '',
        author_name: item.author_name || '',
        author_role: item.author_role || '',
        title: '',
        video_url: '',
        display_order: item.display_order || 0,
        is_active: item.is_active !== false
      })
    } else {
      setFormData({
        quote: '',
        author_name: '',
        author_role: '',
        title: item.title || '',
        video_url: item.video_url || '',
        display_order: item.display_order || 0,
        is_active: item.is_active !== false
      })
    }
    setActiveTab(type)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number, type: 'text' | 'video') => {
    if (!(await confirmDialog('Are you sure?'))) return
    try {
      
      const endpoint = type === 'text' ? 'text' : 'video'
      const response = await authenticatedFetch(`/api/admin/testimonials/${endpoint}/${id}`, { method: 'DELETE' })

      if (response.ok) {
        fetchTestimonials()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete testimonial')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Error deleting testimonial')
    }
  }

  const resetForm = () => {
    setFormData({
      quote: '',
      author_name: '',
      author_role: '',
      title: '',
      video_url: '',
      display_order: 0,
      is_active: true
    })
  }

  const getCurrentItems = () => {
    return activeTab === 'text' ? filteredText : filteredVideo
  }

  const getPaginatedItems = () => {
    const items = getCurrentItems()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return items.slice(startIndex, endIndex)
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!(await confirmDialog({ message: `Are you sure you want to delete ${selectedIds.length} testimonial(s)?`, destructive: true }))) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/testimonials/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'delete', type: activeTab })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchTestimonials()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete testimonials')
      }
    } catch (error) {
      console.error('Error deleting testimonials:', error)
      toast.error('Error deleting testimonials')
    }
  }

  const handleBulkActivate = async () => {
    if (selectedIds.length === 0) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/testimonials/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'status', is_active: true, type: activeTab })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchTestimonials()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to activate testimonials')
      }
    } catch (error) {
      console.error('Error activating testimonials:', error)
      toast.error('Error activating testimonials')
    }
  }

  const handleBulkDeactivate = async () => {
    if (selectedIds.length === 0) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/testimonials/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'status', is_active: false, type: activeTab })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchTestimonials()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to deactivate testimonials')
      }
    } catch (error) {
      console.error('Error deactivating testimonials:', error)
      toast.error('Error deactivating testimonials')
    }
  }

  // Clear selection when tab changes
  useEffect(() => {
    setSelectedIds([])
  }, [activeTab])

  const columns: AdminTableColumn<any>[] = [
    {
      key: 'primary',
      header: activeTab === 'text' ? 'Author' : 'Title',
      sortValue: (item) => (activeTab === 'text' ? item.author_name : item.title) || '',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div
              className={`p-2 rounded-lg ${
                activeTab === 'text'
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'bg-red-100 dark:bg-red-900/30'
              }`}
            >
              {activeTab === 'text' ? (
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Video className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--cm-color-text)] truncate">
              {activeTab === 'text' ? item.author_name : item.title}
            </p>
            {activeTab === 'text' && item.author_role && (
              <p className="text-xs text-[var(--cm-color-text-muted)] mt-1">{item.author_role}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'content',
      header: 'Content',
      hideOnMobile: true,
      render: (item) =>
        activeTab === 'text' ? (
          <p className="text-sm text-[var(--cm-color-text-muted)] truncate max-w-md">{item.quote}</p>
        ) : (
          <a
            href={item.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <Video className="w-4 h-4" />
            View Video
          </a>
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
            onClick={() => handleEdit(item, activeTab)}
            className="admin-btn admin-btn--icon admin-btn--icon-edit"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={() => void handleDelete(item.id, activeTab)}
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
    <AdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title="Testimonials"
          description="Manage text and video testimonials for your center"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Testimonials' },
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
              Add New {activeTab === 'text' ? 'Text' : 'Video'} Testimonial
            </button>
          }
        />

        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('text')
              setSearchQuery('')
              setCurrentPage(1)
            }}
            className={`admin-btn admin-btn--md ${
              activeTab === 'text' ? 'admin-btn--primary admin-btn--active' : 'admin-btn--secondary'
            }`}
          >
            <FileText className="w-5 h-5" />
            Text Testimonials ({textTestimonials.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('video')
              setSearchQuery('')
              setCurrentPage(1)
            }}
            className={`admin-btn admin-btn--md ${
              activeTab === 'video' ? 'admin-btn--primary admin-btn--active' : 'admin-btn--secondary'
            }`}
          >
            <Video className="w-5 h-5" />
            Video Testimonials ({videoTestimonials.length})
          </button>
        </div>

        <div className="admin-card space-y-4 p-4">
          <div className="max-w-md">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'text' ? 'Search by author or quote...' : 'Search by title or URL...'
              }
              aria-label="Search testimonials"
            />
          </div>

          <AdminDataTable
            columns={columns}
            rows={paginatedItems}
            rowKey={(item) => item.id}
            loading={loading}
            emptyMessage={
              searchQuery
                ? 'No testimonials match your search.'
                : `No testimonials found. Create your first ${activeTab} testimonial.`
            }
            emptyIcon={<Inbox className="h-12 w-12" />}
            caption="Testimonials"
            selection={{
              selectedKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys.map(Number)),
            }}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={currentItems.length}
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
          title={`${editingItem ? 'Edit' : 'Add'} ${activeTab === 'text' ? 'Text' : 'Video'} Testimonial`}
          formError={formError}
          footer={
            <FormModalActions
              formId="testimonial-form"
              onCancel={() => {
                setIsModalOpen(false)
                setEditingItem(null)
                resetForm()
                clearErrors()
              }}
              submitLabel={editingItem ? 'Update Testimonial' : 'Create Testimonial'}
            />
          }
        >
          <form id="testimonial-form" onSubmit={handleSubmit} noValidate>
            {activeTab === 'text' ? (
              <>
                <AdminFormField label="Quote" required error={errors.quote}>
                  <textarea
                    value={formData.quote}
                    onChange={(e) => {
                      clearFieldError('quote')
                      setFormData({ ...formData, quote: e.target.value })
                    }}
                    className={adminControlClass(errors, 'quote')}
                    rows={3}
                    placeholder="Enter testimonial quote"
                  />
                </AdminFormField>
                <div className="admin-form-row admin-form-row--2">
                  <AdminFormField label="Author Name" required error={errors.author_name} className="admin-form-col-6">
                    <input
                      type="text"
                      value={formData.author_name}
                      onChange={(e) => {
                        clearFieldError('author_name')
                        setFormData({ ...formData, author_name: e.target.value })
                      }}
                      className={adminControlClass(errors, 'author_name')}
                      placeholder="Enter author name"
                    />
                  </AdminFormField>
                  <AdminFormField label="Author Role" className="admin-form-col-6">
                    <input
                      type="text"
                      value={formData.author_role}
                      onChange={(e) => setFormData({ ...formData, author_role: e.target.value })}
                      className="admin-form-control"
                      placeholder="Enter author role"
                    />
                  </AdminFormField>
                </div>
              </>
            ) : (
              <>
                <div className="admin-form-row admin-form-row--2">
                  <AdminFormField label="Video Title" required error={errors.title} className="admin-form-col-6">
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => {
                        clearFieldError('title')
                        setFormData({ ...formData, title: e.target.value })
                      }}
                      className={adminControlClass(errors, 'title')}
                      placeholder="e.g., CAT Preparation Journey"
                    />
                  </AdminFormField>
                  <AdminFormField
                    label="Video URL (YouTube)"
                    required
                    error={errors.video_url}
                    hint="Paste YouTube embed URL or regular YouTube link (will be converted automatically)"
                    className="admin-form-col-6"
                  >
                    <input
                      type="url"
                      value={formData.video_url}
                      onChange={(e) => {
                        clearFieldError('video_url')
                        setFormData({ ...formData, video_url: e.target.value })
                      }}
                      className={adminControlClass(errors, 'video_url')}
                      placeholder="https://www.youtube.com/embed/VIDEO_ID or https://youtu.be/VIDEO_ID"
                    />
                  </AdminFormField>
                </div>
              </>
            )}
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
