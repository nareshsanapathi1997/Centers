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
import BulkActions from '@/components/admin/BulkActions'
import PageHeader from '@/components/ui/PageHeader'
import { Input } from '@/components/forms'
import { ADMIN_CONTENT_FORM_RULES } from '@/lib/admin-content-form-rules'
import { adminControlClass } from '@/lib/admin-form-ui'
import SafeImage from '@/components/ui/SafeImage'
import { Plus, Edit, Trash2, User, GraduationCap, Award, Star, CheckCircle, XCircle, Video, Inbox } from 'lucide-react'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

export default function StudentStoriesManagement({ params }: { params: { centerId: string } }) {
  const [filteredStories, setFilteredStories] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStory, setEditingStory] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [formData, setFormData] = useState({
    student_name: '',
    video_url: ''
  })
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, ADMIN_CONTENT_FORM_RULES.studentStories)

  const { data: storiesData, loading, error, refetch: fetchStories } = useAdminFetch<any[]>(
    `admin-student-stories-${params.centerId}`,
    `/api/admin/student-stories?centerId=${params.centerId}`,
    { },
  )
  const stories = storiesData ?? []

useEffect(() => {
    if (searchQuery) {
      const filtered = stories.filter(
        (story) =>
          story.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          story.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          story.achievement_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          story.story_content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          story.batch_year?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredStories(filtered)
    } else {
      setFilteredStories(stories)
    }
    setCurrentPage(1)
  }, [searchQuery, stories])

  const currentStories = filteredStories
  const totalPages = Math.ceil(currentStories.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedStories = currentStories.slice(startIndex, endIndex)

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

  const resetForm = () => {
    setFormData({
      student_name: '',
      video_url: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!validate(formData)) return

    try {
      
      const url = withBasePath(
        editingStory
          ? `/api/admin/student-stories/${editingStory.id}`
          : '/api/admin/student-stories'
      )
      const method = editingStory ? 'PATCH' : 'POST'
      const embedUrl = convertToEmbedUrl(formData.video_url)

      const body = editingStory
        ? { ...formData, video_url: embedUrl, center_id: parseInt(params.centerId) }
        : {
            ...formData,
            video_url: embedUrl,
            story_content: formData.student_name,
            center_id: parseInt(params.centerId)
          }

      const response = await fetch(url, {
        credentials: 'include',
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        setIsModalOpen(false)
        resetForm()
        setEditingStory(null)
        fetchStories(true)
      } else {
        const error = await response.json()
        setFormError(error.error || 'Failed to save story')
      }
    } catch (error) {
      console.error('Error saving student story:', error)
      setFormError('Error saving student story')
    }
  }

  const handleEdit = (story: any) => {
    clearErrors()
    setEditingStory(story)
    setFormData({
      student_name: story.student_name || '',
      video_url: story.video_url || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ message: 'Are you sure you want to delete this story?', destructive: true }))) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/student-stories/${id}`, { method: 'DELETE' })

      if (response.ok) {
        fetchStories(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete story')
      }
    } catch (error) {
      console.error('Error deleting student story:', error)
      toast.error('Error deleting student story')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return

    if (!(await confirmDialog({ message: `Are you sure you want to delete ${selectedIds.length} story/stories?`, destructive: true }))) return

    try {
      
      const deletePromises = selectedIds.map((id) =>
        authenticatedFetch(`/api/admin/student-stories/${id}`, { method: 'DELETE' })
      )

      await Promise.all(deletePromises)
      setSelectedIds([])
      fetchStories(true)
    } catch (error) {
      console.error('Error deleting student stories:', error)
      toast.error('Error deleting student stories')
    }
  }

  const handleBulkStatusChange = async (isActive: boolean) => {
    if (selectedIds.length === 0) return

    try {
      
      const updatePromises = selectedIds.map((id) =>
        authenticatedFetch(`/api/admin/student-stories/${id}`, { method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ is_active: isActive })
        })
      )

      await Promise.all(updatePromises)
      setSelectedIds([])
      fetchStories(true)
    } catch (error) {
      console.error('Error updating student stories:', error)
      toast.error('Error updating student stories')
    }
  }

  const columns: AdminTableColumn<any>[] = [
    {
      key: 'student',
      header: 'Student',
      sortValue: (story) => story.student_name || '',
      render: (story) => (
        <div className="flex items-center gap-3">
          {story.student_image_url ? (
            <SafeImage
              src={story.student_image_url}
              alt={story.student_name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-[var(--cm-color-text)]">{story.student_name}</div>
            {story.video_url && (
              <div className="flex items-center gap-1 text-xs text-[var(--cm-color-text-muted)]">
                <Video className="w-3 h-3" />
                Video
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      hideOnMobile: true,
      sortValue: (story) => story.course_name || '',
      render: (story) => (
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-[var(--cm-color-text-muted)]" />
          <span className="text-sm text-[var(--cm-color-text)]">{story.course_name || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'achievement',
      header: 'Achievement',
      hideOnMobile: true,
      sortValue: (story) => story.achievement_title || '',
      render: (story) => (
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-[var(--cm-color-text)]">{story.achievement_title || 'N/A'}</span>
        </div>
      ),
    },
    {
      key: 'batch',
      header: 'Batch',
      hideOnMobile: true,
      sortValue: (story) => story.batch_year || '',
      render: (story) => (
        <span className="text-sm text-[var(--cm-color-text)]">{story.batch_year || 'N/A'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (story) => (story.is_active ? 1 : 0),
      render: (story) =>
        story.is_active ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            Inactive
          </span>
        ),
    },
    {
      key: 'featured',
      header: 'Featured',
      hideOnMobile: true,
      sortValue: (story) => (story.is_featured ? 1 : 0),
      render: (story) =>
        story.is_featured ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Star className="w-3 h-3 fill-current" />
            Featured
          </span>
        ) : (
          <span className="text-sm text-[var(--cm-color-text-muted)]">-</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (story) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Edit"
            onClick={() => handleEdit(story)}
            className="admin-btn admin-btn--icon admin-btn--icon-edit"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={() => void handleDelete(story.id)}
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
    <AdminPageShell error={error} onRetry={() => void fetchStories(true)}>
      <div className="space-y-6">
        <PageHeader
          title="Student Stories"
          description="Manage success stories and student journeys"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Student Stories' },
          ]}
          actions={
            <button
              type="button"
              onClick={() => {
                resetForm()
                clearErrors()
                setEditingStory(null)
                setIsModalOpen(true)
              }}
              className="admin-btn admin-btn--primary admin-btn--md whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Add New Story
            </button>
          }
        />

        <div className="admin-card space-y-4 p-4">
          <div className="max-w-md">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, course, achievement..."
              aria-label="Search student stories"
            />
          </div>

          <AdminDataTable
            columns={columns}
            rows={paginatedStories}
            rowKey={(story) => story.id}
            loading={loading}
            emptyMessage="No stories found"
            emptyIcon={<Inbox className="h-12 w-12" />}
            caption="Student stories"
            selection={{
              selectedKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys.map(Number)),
            }}
          />

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={currentStories.length}
              itemsPerPage={itemsPerPage}
              startIndex={startIndex}
              endIndex={endIndex}
              onPageChange={setCurrentPage}
            />
          )}
        </div>

        {selectedIds.length > 0 && (
          <BulkActions
            selectedIds={selectedIds}
            onBulkDelete={handleBulkDelete}
            onBulkActivate={() => handleBulkStatusChange(true)}
            onBulkDeactivate={() => handleBulkStatusChange(false)}
            onClearSelection={() => setSelectedIds([])}
            entityLabel="story"
          />
        )}

        <FormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            resetForm()
            setEditingStory(null)
            clearErrors()
          }}
          title={editingStory ? 'Edit Story' : 'Add New Story'}
          formError={formError}
          footer={
            <FormModalActions
              formId="student-story-form"
              onCancel={() => {
                setIsModalOpen(false)
                resetForm()
                setEditingStory(null)
                clearErrors()
              }}
              submitLabel={editingStory ? 'Update Story' : 'Create Story'}
            />
          }
        >
          <form id="student-story-form" onSubmit={handleSubmit} noValidate>
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Story Title" required error={errors.student_name} className="admin-form-col-6">
                <input
                  type="text"
                  value={formData.student_name}
                  onChange={(e) => {
                    clearFieldError('student_name')
                    setFormData({ ...formData, student_name: e.target.value })
                  }}
                  className={adminControlClass(errors, 'student_name')}
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
          </form>
        </FormModal>
      </div>
    </AdminPageShell>
  )
}
