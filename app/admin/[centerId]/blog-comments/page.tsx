'use client'

import { withBasePath } from '@/lib/with-base-path'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAdminFetch } from '@/lib/use-admin-fetch'
import AdminPageShell from '@/components/admin/AdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import type { BlogComment, BlogCommentStatus } from '@/types'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ExternalLink,
  RefreshCw,
  Trash2,
  Inbox,
} from 'lucide-react'

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function statusBadge(status: BlogCommentStatus) {
  if (status === 'hidden') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
        <EyeOff className="h-3.5 w-3.5" />
        Hidden
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300">
      <Eye className="h-3.5 w-3.5" />
      Visible
    </span>
  )
}

export default function BlogCommentsPage({ params }: { params: { centerId: string } }) {
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1})
  const [statusFilter, setStatusFilter] = useState<'all' | BlogCommentStatus>('all')

  const query = `/api/admin/blog-comments?centerId=${params.centerId}&page=${pagination.page}&limit=${pagination.limit}&status=${statusFilter}`

  const { data, loading, refetch } = useAdminFetch<{
    comments: BlogComment[]
    hiddenCount: number
    pagination: Pagination
  }>(`admin-blog-comments-${params.centerId}-${pagination.page}-${statusFilter}`, query, {
    auth: true,
    parse: (json) => {
      const payload = json as {
        comments?: BlogComment[]
        hiddenCount?: number
        pagination?: Pagination
      }
      return {
        comments: payload.comments ?? [],
        hiddenCount: payload.hiddenCount ?? 0,
        pagination: payload.pagination ?? pagination}
    }})

  const comments = data?.comments ?? []
  const hiddenCount = data?.hiddenCount ?? 0

  useEffect(() => {
    if (data?.pagination) {
      setPagination((prev) => ({ ...prev, ...data.pagination }))
    }
  }, [data?.pagination])

  const updateComment = async (comment: BlogComment, status: BlogCommentStatus) => {
    try {
      const response = await fetch(withBasePath('/api/admin/blog-comments'), { credentials: 'include',
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'},
        body: JSON.stringify({
          id: comment.id,
          centerId: Number.parseInt(params.centerId, 10),
          status,
          is_read: true})})

      if (response.ok) {
        void refetch(true)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update comment')
      }
    } catch (error) {
      console.error('Error updating comment:', error)
      alert('Failed to update comment')
    }
  }

  const deleteComment = async (id: number) => {
    if (!confirm('Delete this comment permanently?')) return

    try {
      const response = await fetch(withBasePath(`/api/admin/blog-comments?id=${id}&centerId=${params.centerId}`), { method: 'DELETE', credentials: 'include' })

      if (response.ok) {
        void refetch(true)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete comment')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
    }
  }

  const columns: AdminTableColumn<BlogComment>[] = [
    {
      key: 'author',
      header: 'Author',
      sortValue: (comment) => comment.author_name || '',
      render: (comment) => (
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge(comment.status)}
            <span className="text-sm font-semibold text-[var(--cm-color-text)]">
              {comment.author_name}
            </span>
          </div>
          <p className="text-sm text-[var(--cm-color-text-muted)]">{comment.author_email}</p>
        </div>
      ),
    },
    {
      key: 'body',
      header: 'Comment',
      render: (comment) => (
        <p className="whitespace-pre-wrap text-sm text-[var(--cm-color-text)] line-clamp-4">
          {comment.body}
        </p>
      ),
    },
    {
      key: 'blog',
      header: 'Blog Post',
      hideOnMobile: true,
      sortValue: (comment) => comment.blog_post_title || '',
      render: (comment) => (
        <div className="space-y-1 text-sm">
          <strong className="font-medium text-[var(--cm-color-text)]">
            {comment.blog_post_title || 'Untitled'}
          </strong>
          {comment.blog_post_slug && comment.center_slug ? (
            <div>
              <Link
                href={`/${comment.center_slug}/blog/${comment.blog_post_slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
              >
                View post
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ) : null}
          <p className="text-xs text-[var(--cm-color-text-muted)]">
            {new Date(comment.created_at).toLocaleString()}
          </p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (comment) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {comment.status === 'visible' ? (
            <button
              type="button"
              onClick={() => void updateComment(comment, 'hidden')}
              className="inline-flex items-center gap-1 rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500"
            >
              <EyeOff className="h-4 w-4" />
              Hide
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void updateComment(comment, 'visible')}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              <Eye className="h-4 w-4" />
              Show
            </button>
          )}
          <button
            type="button"
            onClick={() => void deleteComment(comment.id)}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      ),
    },
  ]

  return (
    <AdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title="Blog Comments"
          description="New comments stay hidden until you Show them. Hide any comment you do not want shown publicly."
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Blog Comments' },
          ]}
          actions={
            <button
              type="button"
              onClick={() => void refetch(true)}
              className="admin-btn admin-btn--secondary admin-btn--sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          }
        />

        <div className="admin-card space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            {(['all', 'visible', 'hidden'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
                className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                }`}
              >
                {status}
                {status === 'hidden' && hiddenCount > 0 ? ` (${hiddenCount})` : ''}
              </button>
            ))}
          </div>

          <AdminDataTable
            columns={columns}
            rows={comments}
            rowKey={(comment) => comment.id}
            loading={loading}
            emptyMessage="No comments found for this filter."
            emptyIcon={<Inbox className="h-12 w-12" />}
            caption="Blog comments"
            rowClassName={(comment) =>
              comment.status === 'hidden' ? 'bg-[var(--cm-color-surface-muted)]/50' : undefined
            }
          />

          {pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-[var(--cm-color-border)] pt-4">
              <p className="text-sm text-[var(--cm-color-text-muted)]">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} comments)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  className="rounded-lg border border-[var(--cm-color-border)] p-2 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="rounded-lg border border-[var(--cm-color-border)] p-2 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AdminPageShell>
  )
}
