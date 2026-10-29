'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { superAdminFetch } from '@/lib/super-admin-api'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { Input } from '@/components/forms'
import { confirmDialog } from '@/lib/admin-ui-store'
import {
  Inbox,
  Mail,
  Phone,
  User,
  BookOpen,
  MessageSquare,
  Calendar,
  Trash2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface ContactSubmission {
  id: number
  center_id: number
  center_name: string
  center_slug: string
  full_name: string
  email: string
  phone: string
  course_name: string | null
  message: string | null
  is_read: boolean
  created_at: string
}

export default function CenterContactSubmissionsPage() {
  const params = useParams()
  const centerId = params?.centerId ? parseInt(params.centerId as string) : null

  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [centerInfo, setCenterInfo] = useState<{ name: string; slug: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  useEffect(() => {
    if (centerId) {
      fetchSubmissions()
    }
  }, [centerId, pagination.page])

  const fetchSubmissions = async () => {
    if (!centerId) return

    try {
      setLoading(true)

      const query = new URLSearchParams({
        centerId: centerId.toString(),
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      const response = await superAdminFetch(`/api/super-admin/contact-submissions?${query}`)

      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.submissions)
        setPagination(data.pagination)

        if (data.submissions.length > 0) {
          setCenterInfo({
            name: data.submissions[0].center_name,
            slug: data.submissions[0].center_slug,
          })
        } else {
          fetchCenterInfo()
        }
      }
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCenterInfo = async () => {
    if (!centerId) return

    try {
      const response = await superAdminFetch(`/api/super-admin/centers/${centerId}`)

      if (response.ok) {
        const center = await response.json()
        setCenterInfo({
          name: center.name,
          slug: center.slug,
        })
      }
    } catch (error) {
      console.error('Error fetching center info:', error)
    }
  }

  const markAsRead = async (id: number, isRead: boolean) => {
    try {
      const response = await superAdminFetch('/api/super-admin/contact-submissions', {
        method: 'PATCH',
        body: JSON.stringify({ id, is_read: !isRead }),
      })

      if (response.ok) {
        setSubmissions(submissions.map((s) => (s.id === id ? { ...s, is_read: !isRead } : s)))
      }
    } catch (error) {
      console.error('Error updating submission:', error)
    }
  }

  const deleteSubmission = async (id: number) => {
    if (
      !(await confirmDialog({
        message: 'Are you sure you want to delete this submission?',
        destructive: true,
      }))
    ) {
      return
    }

    try {
      const response = await superAdminFetch(`/api/super-admin/contact-submissions?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSubmissions(submissions.filter((s) => s.id !== id))
        fetchSubmissions()
      }
    } catch (error) {
      console.error('Error deleting submission:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredSubmissions = submissions.filter((submission) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        submission.full_name.toLowerCase().includes(term) ||
        submission.email.toLowerCase().includes(term) ||
        submission.phone?.toLowerCase().includes(term) ||
        submission.course_name?.toLowerCase().includes(term) ||
        submission.message?.toLowerCase().includes(term)
      )
    }
    return true
  })

  const unreadCount = submissions.filter((s) => !s.is_read).length

  const columns: AdminTableColumn<ContactSubmission>[] = [
    {
      key: 'status',
      header: 'Status',
      sortValue: (s) => (s.is_read ? 0 : 1),
      render: (s) =>
        !s.is_read ? (
          <span className="admin-badge admin-badge-warning">New</span>
        ) : (
          <span className="admin-badge">Read</span>
        ),
    },
    {
      key: 'full_name',
      header: 'Name',
      sortValue: (s) => s.full_name,
      render: (s) => (
        <span className="inline-flex items-center gap-2 font-medium">
          <User className="h-4 w-4 text-[var(--cm-color-text-muted)]" />
          {s.full_name}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (s) => (
        <span className="inline-flex items-center gap-2">
          <Mail className="h-4 w-4 text-[var(--cm-color-text-muted)]" />
          {s.email}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      hideOnMobile: true,
      render: (s) => (
        <span className="inline-flex items-center gap-2">
          <Phone className="h-4 w-4 text-[var(--cm-color-text-muted)]" />
          {s.phone || 'N/A'}
        </span>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      hideOnMobile: true,
      render: (s) =>
        s.course_name ? (
          <span className="inline-flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--cm-color-text-muted)]" />
            {s.course_name}
          </span>
        ) : (
          <span className="text-[var(--cm-color-text-muted)]">—</span>
        ),
    },
    {
      key: 'message',
      header: 'Message',
      hideOnMobile: true,
      render: (s) =>
        s.message ? (
          <span className="inline-flex items-start gap-2 max-w-xs">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--cm-color-text-muted)]" />
            <span className="line-clamp-2 text-sm">{s.message}</span>
          </span>
        ) : (
          <span className="text-[var(--cm-color-text-muted)]">—</span>
        ),
    },
    {
      key: 'created_at',
      header: 'Date',
      sortValue: (s) => new Date(s.created_at),
      render: (s) => (
        <span className="inline-flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-[var(--cm-color-text-muted)]" />
          {formatDate(s.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (submission) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => markAsRead(submission.id, submission.is_read)}
            className="admin-btn admin-btn--icon"
            title={submission.is_read ? 'Mark as unread' : 'Mark as read'}
            aria-label={submission.is_read ? 'Mark as unread' : 'Mark as read'}
          >
            {submission.is_read ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={() => deleteSubmission(submission.id)}
            className="admin-btn admin-btn--icon admin-btn--icon-danger"
            title="Delete submission"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  if (!centerId) {
    return (
      <SuperAdminPageShell>
        <ErrorState error="Invalid center ID" />
      </SuperAdminPageShell>
    )
  }

  return (
    <SuperAdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <Inbox className="h-7 w-7" />
              {centerInfo?.name || 'Contact Submissions'}
            </span>
          }
          description={centerInfo?.slug || 'Center contact form submissions'}
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Contact Submissions', href: '/super-admin/contact-submissions' },
            { label: centerInfo?.name || 'Center' },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <div className="admin-card px-4 py-2 text-center">
                <div className="text-xs text-[var(--cm-color-text-muted)]">Unread</div>
                <div className="text-xl font-bold">{unreadCount}</div>
              </div>
              <div className="admin-card px-4 py-2 text-center">
                <div className="text-xs text-[var(--cm-color-text-muted)]">Total</div>
                <div className="text-xl font-bold">{pagination.total}</div>
              </div>
              <Link href="/super-admin/contact-submissions" className="admin-btn admin-btn--secondary admin-btn--sm">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Link>
            </div>
          }
        />

        <div className="admin-card p-4">
          <Input
            type="search"
            placeholder="Search by name, email, phone, course, or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search submissions"
          />
        </div>

        <div className="admin-card overflow-hidden">
          {loading && submissions.length === 0 ? (
            <div className="p-6">
              <LoadingSkeleton variant="table" rows={6} />
            </div>
          ) : (
            <>
              <AdminDataTable
                columns={columns}
                rows={filteredSubmissions}
                rowKey={(s) => s.id}
                loading={loading}
                rowClassName={(s) => (!s.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : undefined)}
                caption="Center contact submissions"
                emptyMessage={
                  searchTerm
                    ? 'No submissions match your search criteria.'
                    : 'This center has no contact form submissions yet.'
                }
                emptyIcon={<Inbox className="h-12 w-12" />}
              />

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[var(--cm-color-border)] px-6 py-4">
                  <div className="text-sm text-[var(--cm-color-text-muted)]">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} submissions
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page === 1}
                      className="admin-btn admin-btn--sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <span className="text-sm text-[var(--cm-color-text-muted)]">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      disabled={pagination.page === pagination.totalPages}
                      className="admin-btn admin-btn--sm"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </SuperAdminPageShell>
  )
}
