'use client'
import { authenticatedFetch } from '@/lib/admin-api'

import { useState } from 'react'
import { useAdminFetch } from '@/lib/use-admin-fetch'
import AdminPageShell from '@/components/admin/AdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/forms'
import ImageUpload from '@/components/admin/ImageUpload'
import SafeImage from '@/components/ui/SafeImage'
import { Image as ImageIcon, Upload, Trash2, Eye, Download } from 'lucide-react'
import { confirmDialog } from '@/lib/admin-ui-store'

export default function ImageLibrary({ params }: { params: { centerId: string } }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [viewingImage, setViewingImage] = useState<any>(null)

  const { data: imagesData, loading, refetch: fetchImages } = useAdminFetch<any[]>(
    `admin-image-library-${params.centerId}`,
    `/api/admin/image-library?centerId=${params.centerId}`,
    { auth: true },
  )
  const images = imagesData ?? []

  const handleUpload = async (url: string) => {
    try {
      const response = await authenticatedFetch('/api/admin/image-library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          center_id: parseInt(params.centerId),
          file_url: url,
          alt_text: '',
          tags: [],
        }),
      })
      if (response.ok) {
        setUploadModalOpen(false)
        fetchImages(true)
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (
      !(await confirmDialog({
        message: 'Are you sure you want to delete this image?',
        destructive: true,
      }))
    )
      return
    try {
      await authenticatedFetch(`/api/admin/image-library/${id}`, { method: 'DELETE' })
      fetchImages(true)
    } catch (error) {
      console.error('Error deleting image:', error)
    }
  }

  const allTags = Array.from(new Set(images.flatMap((img) => img.tags || [])))
  const filteredImages = images.filter(
    (img) =>
      (searchTerm === '' ||
        img.alt_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        img.filename?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedTag === '' || (img.tags || []).includes(selectedTag))
  )

  return (
    <AdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title="Image Library"
          description="Manage and reuse images across your center"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Image Library' },
          ]}
          actions={
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="admin-btn admin-btn--primary admin-btn--sm"
            >
              <Upload className="w-5 h-5" />
              Upload Image
            </button>
          }
        />

        <div className="admin-card space-y-4 p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <Input
                type="search"
                placeholder="Search images..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search images"
              />
            </div>
            {allTags.length > 0 && (
              <Select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                aria-label="Filter by tag"
                className="max-w-xs"
              >
                <option value="">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            </div>
          ) : filteredImages.length === 0 ? (
            <EmptyState
              title="No images found"
              message={
                searchTerm || selectedTag
                  ? 'Try a different search or tag filter.'
                  : 'Upload your first image to get started.'
              }
              icon={ImageIcon}
              action={
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(true)}
                  className="admin-btn admin-btn--primary admin-btn--sm"
                >
                  <Upload className="w-4 h-4" />
                  Upload Image
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              {filteredImages.map((image) => (
                <div
                  key={image.id}
                  className="group overflow-hidden rounded-xl border border-[var(--cm-color-border)] bg-[var(--cm-color-surface)] shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-square bg-[var(--cm-color-surface-muted)]">
                    <SafeImage
                      src={image.file_url}
                      alt={image.alt_text || image.filename}
                      className="h-full w-full cursor-pointer object-cover"
                      onClick={() => setViewingImage(image)}
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-colors group-hover:bg-black/50 group-hover:opacity-100">
                      <button
                        type="button"
                        aria-label="View"
                        onClick={() => setViewingImage(image)}
                        className="rounded-lg bg-white p-2 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete"
                        onClick={() => void handleDelete(image.id)}
                        className="rounded-lg bg-red-500 p-2 text-white hover:bg-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs text-[var(--cm-color-text-muted)]">
                      {image.alt_text || image.filename}
                    </p>
                    {image.tags && image.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {image.tags.slice(0, 2).map((tag: string) => (
                          <span
                            key={tag}
                            className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-[var(--cm-color-text-muted)]">
                      Used {image.usage_count || 0} times
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-xl bg-[var(--cm-color-surface)] p-6 shadow-xl">
              <h2 className="mb-4 text-2xl font-bold text-[var(--cm-color-text)]">Upload Image</h2>
              <ImageUpload
                label=""
                value=""
                onChange={handleUpload}
                folder="library"
                centerId={params.centerId}
              />
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="mt-4 w-full rounded-lg border-2 border-[var(--cm-color-border)] px-4 py-2 text-[var(--cm-color-text)] hover:bg-[var(--cm-color-surface-muted)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {viewingImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setViewingImage(null)}
          >
            <div className="w-full max-w-4xl">
              <SafeImage
                src={viewingImage.file_url}
                alt={viewingImage.alt_text || viewingImage.filename}
                className="h-auto w-full rounded-lg"
              />
              <div className="mt-4 text-center text-white">
                <p className="text-lg font-semibold">
                  {viewingImage.alt_text || viewingImage.filename}
                </p>
                <a
                  href={viewingImage.file_url}
                  download
                  className="admin-btn admin-btn--primary admin-btn--sm"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminPageShell>
  )
}
