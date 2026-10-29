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
import BulkActions from '@/components/admin/BulkActions'
import RichTextEditor from '@/components/admin/RichTextEditor'
import PageHeader from '@/components/ui/PageHeader'
import { Input } from '@/components/forms'
import { ADMIN_CONTENT_FORM_RULES } from '@/lib/admin-content-form-rules'
import { adminControlClass } from '@/lib/admin-form-ui'
import { Plus, Edit, Trash2, FileText, User, Calendar, CheckCircle, XCircle, Inbox } from 'lucide-react'
import ImageUpload from '@/components/admin/ImageUpload'
import {
  ADMIN_IMAGE_ACCEPT,
  ADMIN_IMAGE_FORMAT_HINT,
  validateAdminImageFiles
} from '@/lib/admin-image-upload-validation'
import {
  GALLERY_RESULTS_IMAGE_HEIGHT,
  GALLERY_RESULTS_IMAGE_SIZE_LABEL,
  GALLERY_RESULTS_IMAGE_WIDTH
} from '@/lib/gallery-results-image-spec'
import { validateGalleryResultsImageFiles } from '@/lib/image-dimensions'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

export default function BlogManagement({ params }: { params: { centerId: string } }) {
  const [filteredPosts, setFilteredPosts] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [bulkUploadFiles, setBulkUploadFiles] = useState<File[]>([])
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image_url: '',
    author_name: '',
    published_date: '',
    is_published: false
  })
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, ADMIN_CONTENT_FORM_RULES.blog)

  const { data: postsData, loading, error, refetch: fetchPosts } = useAdminFetch<any[]>(
    `admin-blog-${params.centerId}`,
    `/api/admin/blog?centerId=${params.centerId}`,
    { },
  )
  const posts = postsData ?? []

useEffect(() => {
    if (searchQuery) {
      const filtered = posts.filter(
        (post) =>
          post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.author_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredPosts(filtered)
    } else {
      setFilteredPosts(posts)
    }
    setCurrentPage(1)
  }, [searchQuery, posts])

  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedPosts = filteredPosts.slice(startIndex, endIndex)

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()

    const payload = {
      ...formData,
      slug: formData.slug || generateSlug(formData.title)
    }
    if (!validate(payload)) return

    try {
      
      const url = withBasePath(editingPost ? `/api/admin/blog/${editingPost.id}` : '/api/admin/blog')
      const method = editingPost ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        credentials: 'include',
        method,
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...payload, center_id: parseInt(params.centerId) })
      })

      if (response.ok) {
        setIsModalOpen(false)
        setEditingPost(null)
        resetForm()
        fetchPosts(true)
      } else {
        const error = await response.json()
        setFormError(error.error || 'Failed to save blog post')
      }
    } catch (error) {
      console.error('Error saving post:', error)
      setFormError('Error saving blog post')
    }
  }

  const handleEdit = (post: any) => {
    clearErrors()
    setEditingPost(post)
    setFormData({
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      featured_image_url: post.featured_image_url || '',
      author_name: post.author_name || '',
      published_date: post.published_date || '',
      is_published: post.is_published || false
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog('Are you sure?'))) return
    try {
      
      const response = await authenticatedFetch(`/api/admin/blog/${id}`, { method: 'DELETE' })

      if (response.ok) {
        fetchPosts(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete blog post')
      }
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Error deleting blog post')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      featured_image_url: '',
      author_name: '',
      published_date: '',
      is_published: false
    })
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!(await confirmDialog({ message: `Are you sure you want to delete ${selectedIds.length} post(s)?`, destructive: true }))) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/blog/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'delete' })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchPosts(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete posts')
      }
    } catch (error) {
      console.error('Error deleting posts:', error)
      toast.error('Error deleting posts')
    }
  }

  const handleBulkPublish = async () => {
    if (selectedIds.length === 0) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/blog/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'status', is_published: true })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchPosts(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to publish posts')
      }
    } catch (error) {
      console.error('Error publishing posts:', error)
      toast.error('Error publishing posts')
    }
  }

  const handleBulkUnpublish = async () => {
    if (selectedIds.length === 0) return

    try {
      
      const response = await authenticatedFetch(`/api/admin/blog/bulk?centerId=${params.centerId}`, { method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds, action: 'status', is_published: false })
      })

      if (response.ok) {
        setSelectedIds([])
        fetchPosts(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to unpublish posts')
      }
    } catch (error) {
      console.error('Error unpublishing posts:', error)
      toast.error('Error unpublishing posts')
    }
  }

  const handleBulkUpload = async (files: File[], authorName: string) => {
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
      formData.append('author_name', authorName || 'Admin')

      const response = await authenticatedFetch('/api/admin/blog/bulk-upload', { method: 'POST',
                body: formData })

      if (response.ok) {
        setIsBulkUploadOpen(false)
        setBulkUploadFiles([])
        fetchPosts(true)
        toast.success(`Successfully uploaded ${files.length} blog post(s)`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to upload blog posts')
      }
    } catch (error) {
      console.error('Error uploading blog posts:', error)
      toast.error('Error uploading blog posts')
    }
  }

  const columns: AdminTableColumn<any>[] = [
    {
      key: 'title',
      header: 'Title',
      sortValue: (post) => post.title || '',
      render: (post) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--cm-color-text)] truncate">
              {post.title || 'Untitled'}
            </p>
            {post.excerpt && (
              <p className="text-xs text-[var(--cm-color-text-muted)] truncate mt-1 max-w-md">
                {post.excerpt}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'author',
      header: 'Author',
      hideOnMobile: true,
      sortValue: (post) => post.author_name || '',
      render: (post) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-[var(--cm-color-text-muted)]" />
          <span className="text-sm text-[var(--cm-color-text-muted)]">
            {post.author_name || 'Admin'}
          </span>
        </div>
      ),
    },
    {
      key: 'published_date',
      header: 'Published Date',
      hideOnMobile: true,
      sortValue: (post) => post.published_date || '',
      render: (post) =>
        post.published_date ? (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--cm-color-text-muted)]" />
            <span className="text-sm text-[var(--cm-color-text-muted)]">
              {new Date(post.published_date).toLocaleDateString()}
            </span>
          </div>
        ) : (
          <span className="text-sm text-[var(--cm-color-text-muted)]">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (post) => (post.is_published ? 1 : 0),
      render: (post) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            post.is_published
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          {post.is_published ? (
            <>
              <CheckCircle className="w-3 h-3 mr-1.5" />
              Published
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3 mr-1.5" />
              Draft
            </>
          )}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (post) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Edit"
            onClick={() => handleEdit(post)}
            className="admin-btn admin-btn--icon admin-btn--icon-edit"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={() => void handleDelete(post.id)}
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
    <AdminPageShell error={error} onRetry={() => void fetchPosts(true)}>
      <div className="space-y-6">
        <PageHeader
          title="Blog Posts"
          description="Create and manage blog posts for your center"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Blog' },
          ]}
          actions={
            <button
              type="button"
              onClick={() => {
                resetForm()
                clearErrors()
                setEditingPost(null)
                setIsModalOpen(true)
              }}
              className="admin-btn admin-btn--primary admin-btn--md whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Add New Post
            </button>
          }
        />

        <div className="admin-card space-y-4 p-4">
          <div className="max-w-md">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, or excerpt..."
              aria-label="Search blog posts"
            />
          </div>

          <AdminDataTable
            columns={columns}
            rows={paginatedPosts}
            rowKey={(post) => post.id}
            loading={loading}
            emptyMessage={
              searchQuery
                ? 'No blog posts match your search.'
                : 'No blog posts found. Create your first blog post.'
            }
            emptyIcon={<Inbox className="h-12 w-12" />}
            caption="Blog posts"
            selection={{
              selectedKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys.map(Number)),
            }}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredPosts.length}
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
            setEditingPost(null)
            resetForm()
            clearErrors()
          }}
          title={editingPost ? 'Edit Blog Post' : 'Add Blog Post'}
          size="large"
          formError={formError}
          footer={
            <FormModalActions
              formId="blog-post-form"
              onCancel={() => {
                setIsModalOpen(false)
                setEditingPost(null)
                resetForm()
                clearErrors()
              }}
              submitLabel={editingPost ? 'Update Post' : 'Create Post'}
            />
          }
        >
          <form id="blog-post-form" onSubmit={handleSubmit} noValidate>
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Title" required error={errors.title} className="admin-form-col-6">
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    clearFieldError('title')
                    setFormData({ ...formData, title: e.target.value })
                    if (!editingPost) {
                      setFormData((prev) => ({ ...prev, slug: generateSlug(e.target.value) }))
                    }
                  }}
                  className={adminControlClass(errors, 'title')}
                  placeholder="Enter blog post title"
                />
              </AdminFormField>
              <AdminFormField label="Slug" required error={errors.slug} className="admin-form-col-6">
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => {
                    clearFieldError('slug')
                    setFormData({ ...formData, slug: e.target.value })
                  }}
                  className={adminControlClass(errors, 'slug')}
                  placeholder="blog-post-slug"
                />
              </AdminFormField>
            </div>
            <AdminFormField label="Excerpt">
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                className="admin-form-control"
                rows={3}
                placeholder="Enter blog post excerpt"
              />
            </AdminFormField>
            <AdminFormField label="Content (rich text or HTML)">
              <RichTextEditor
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                placeholder="Enter blog post content. Use the toolbar for formatting or paste HTML."
              />
            </AdminFormField>
            <ImageUpload
              label="Featured Image"
              value={formData.featured_image_url}
              onChange={(url) => setFormData({ ...formData, featured_image_url: url })}
              folder="blog"
              centerId={params.centerId}
              minWidth={GALLERY_RESULTS_IMAGE_WIDTH}
              minHeight={GALLERY_RESULTS_IMAGE_HEIGHT}
              maxWidth={GALLERY_RESULTS_IMAGE_WIDTH}
              maxHeight={GALLERY_RESULTS_IMAGE_HEIGHT}
              helpText={`Upload a ${GALLERY_RESULTS_IMAGE_SIZE_LABEL} image (16:9). ${ADMIN_IMAGE_FORMAT_HINT}.`}
            />
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Author Name" className="admin-form-col-6">
                <input
                  type="text"
                  value={formData.author_name}
                  onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                  className="admin-form-control"
                  placeholder="Author name"
                />
              </AdminFormField>
              <AdminFormField label="Published Date" className="admin-form-col-6">
                <input
                  type="date"
                  value={formData.published_date}
                  onChange={(e) => setFormData({ ...formData, published_date: e.target.value })}
                  className="admin-form-control"
                />
              </AdminFormField>
            </div>
            <div className="admin-form-checkgroup">
              <label htmlFor="is_published" className="admin-form-check">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                />
                <span>Publish</span>
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
          title="Bulk Upload Blog Posts"
          footer={
            <FormModalActions
              formId="blog-bulk-upload-form"
              onCancel={() => {
                setIsBulkUploadOpen(false)
                setBulkUploadFiles([])
              }}
              submitLabel={
                bulkUploadFiles.length > 0
                  ? `Upload ${bulkUploadFiles.length} Post(s)`
                  : 'Upload Post(s)'
              }
              submitDisabled={bulkUploadFiles.length === 0}
            />
          }
        >
          <form
            id="blog-bulk-upload-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (bulkUploadFiles.length === 0) {
                toast.error('Please select at least one image')
                return
              }
              const authorName =
                (document.getElementById('bulk-author-name') as HTMLInputElement)?.value || 'Admin'
              handleBulkUpload(bulkUploadFiles, authorName)
            }}
            noValidate
          >
            <MultiFilePickField
              label="Featured Images"
              files={bulkUploadFiles}
              onChange={setBulkUploadFiles}
              accept={ADMIN_IMAGE_ACCEPT}
              formatHint={`${GALLERY_RESULTS_IMAGE_SIZE_LABEL} · ${ADMIN_IMAGE_FORMAT_HINT}`}
              helpText={`Each image must be exactly ${GALLERY_RESULTS_IMAGE_SIZE_LABEL}.`}
            />
            <AdminFormField label="Author Name" htmlFor="bulk-author-name">
              <input
                type="text"
                id="bulk-author-name"
                defaultValue="Admin"
                className="admin-form-control"
                placeholder="Enter author name"
              />
            </AdminFormField>
          </form>
        </FormModal>

        <BulkActions
          selectedIds={selectedIds}
          onBulkDelete={handleBulkDelete}
          onBulkActivate={handleBulkPublish}
          onBulkDeactivate={handleBulkUnpublish}
          onClearSelection={() => setSelectedIds([])}
          activateLabel="Publish"
          deactivateLabel="Unpublish"
          entityLabel="post"
        />
      </div>
    </AdminPageShell>
  )
}
