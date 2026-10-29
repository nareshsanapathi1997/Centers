'use client'

import { authenticatedFetch } from '@/lib/admin-api'
import { useEffect, useState } from 'react'
import { useAdminFetch } from '@/lib/use-admin-fetch'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/forms'
import {
  Mail,
  Phone,
  BookOpen,
  Calendar,
  Eye,
  EyeOff,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
} from 'lucide-react'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

interface Enquiry {
  id: number
  center_id: number
  full_name: string
  email: string
  phone: string
  course_name: string | null
  message: string | null
  is_read: boolean
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function EnquiriesPage({ params }: { params: { centerId: string } }) {
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'read' | 'unread'>('all')
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null)

  const enquiriesPath = `/api/admin/enquiries?centerId=${params.centerId}&page=${pagination.page}&limit=${pagination.limit}`

  const {
    data: enquiriesData,
    loading,
    error,
    refetch: fetchEnquiries,
  } = useAdminFetch<{
    submissions: Enquiry[]
    pagination: Pagination
  }>(`admin-enquiries-${params.centerId}-${pagination.page}-${pagination.limit}`, enquiriesPath, {
    auth: true,
    parse: (json) => {
      const payload = json as { submissions?: Enquiry[]; pagination?: Pagination }
      return {
        submissions: payload.submissions ?? [],
        pagination: payload.pagination ?? pagination,
      }
    },
  })
  const enquiries = enquiriesData?.submissions ?? []

  useEffect(() => {
    if (enquiriesData?.pagination) {
      setPagination((prev) => ({ ...prev, ...enquiriesData.pagination }))
    }
  }, [enquiriesData?.pagination])

  const toggleReadStatus = async (enquiry: Enquiry) => {
    try {
      const response = await authenticatedFetch('/api/admin/enquiries', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: enquiry.id,
          is_read: !enquiry.is_read,
          centerId: parseInt(params.centerId),
        }),
      })

      if (response.ok) {
        void fetchEnquiries(true)
        if (selectedEnquiry?.id === enquiry.id) {
          setSelectedEnquiry({ ...enquiry, is_read: !enquiry.is_read })
        }
      } else {
        const errBody = await response.json()
        toast.error(errBody.error || 'Failed to update enquiry status')
      }
    } catch (err) {
      console.error('Error updating enquiry:', err)
      toast.error('Error updating enquiry status')
    }
  }

  const deleteEnquiry = async (id: number) => {
    if (!(await confirmDialog({ message: 'Are you sure you want to delete this enquiry?', destructive: true })))
      return
    try {
      const response = await authenticatedFetch(
        `/api/admin/enquiries?id=${id}&centerId=${params.centerId}`,
        { method: 'DELETE' },
      )

      if (response.ok) {
        if (selectedEnquiry?.id === id) setSelectedEnquiry(null)
        void fetchEnquiries(true)
      } else {
        const errBody = await response.json()
        toast.error(errBody.error || 'Failed to delete enquiry')
      }
    } catch (err) {
      console.error('Error deleting enquiry:', err)
      toast.error('Error deleting enquiry')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const filteredEnquiries = enquiries.filter((enquiry) => {
    const matchesSearch =
      enquiry.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (enquiry.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (enquiry.phone || '').includes(searchTerm) ||
      (enquiry.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'read' && enquiry.is_read) ||
      (filterStatus === 'unread' && !enquiry.is_read)

    return matchesSearch && matchesFilter
  })

  const unreadCount = enquiries.filter((e) => !e.is_read).length

  const columns: AdminTableColumn<Enquiry>[] = [
    {
      key: 'status',
      header: 'Status',
      width: '5rem',
      sortValue: (e) => (e.is_read ? 1 : 0),
      render: (enquiry) =>
        !enquiry.is_read ? (
          <span className="admin-badge admin-badge-info">New</span>
        ) : (
          <span className="admin-badge">Read</span>
        ),
    },
    {
      key: 'full_name',
      header: 'Name',
      sortValue: (e) => e.full_name,
      render: (enquiry) => (
        <span className="font-medium text-[var(--cm-color-text)]" title={enquiry.full_name}>
          {enquiry.full_name}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      hideOnMobile: true,
      render: (enquiry) =>
        enquiry.email ? (
          <a
            href={`mailto:${enquiry.email}`}
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:underline"
            title={enquiry.email}
          >
            {enquiry.email}
          </a>
        ) : (
          <span className="text-[var(--cm-color-text-muted)]">—</span>
        ),
    },
    {
      key: 'phone',
      header: 'Phone',
      hideOnMobile: true,
      render: (enquiry) =>
        enquiry.phone ? (
          <a
            href={`tel:${enquiry.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[var(--cm-color-text-muted)] hover:text-primary"
            title={enquiry.phone}
          >
            {enquiry.phone}
          </a>
        ) : (
          <span className="text-[var(--cm-color-text-muted)]">—</span>
        ),
    },
    {
      key: 'course_name',
      header: 'Course',
      hideOnMobile: true,
      sortValue: (e) => e.course_name,
      render: (enquiry) => enquiry.course_name || '—',
    },
    {
      key: 'created_at',
      header: 'Date',
      sortValue: (e) => (e.created_at ? new Date(e.created_at) : null),
      render: (enquiry) => (
        <span className="whitespace-nowrap text-sm text-[var(--cm-color-text-muted)]">
          {formatDate(enquiry.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (enquiry) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => void toggleReadStatus(enquiry)}
            className="admin-btn admin-btn--icon"
            title={enquiry.is_read ? 'Mark as unread' : 'Mark as read'}
          >
            {enquiry.is_read ? (
              <EyeOff className="h-4 w-4 text-[var(--cm-color-text-muted)]" />
            ) : (
              <Eye className="h-4 w-4 text-primary" />
            )}
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={() => void deleteEnquiry(enquiry.id)}
            className="admin-btn admin-btn--icon admin-btn--icon-danger"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <AdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <Inbox className="h-7 w-7" />
              Contact Enquiries
            </span>
          }
          description={
            <span>
              {pagination.total} total enquiries
              {unreadCount > 0 ? (
                <span className="ml-2 inline-flex rounded-full bg-danger-soft px-2 py-0.5 text-sm font-medium text-danger">
                  {unreadCount} unread
                </span>
              ) : null}
            </span>
          }
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Enquiries' },
          ]}
          actions={
            <button
              type="button"
              onClick={() => void fetchEnquiries(true)}
              className="admin-btn admin-btn--primary admin-btn--sm"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          }
        />

        <div className="admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              type="search"
              placeholder="Search by name, email, phone, or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search enquiries"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-[var(--cm-color-text-muted)]" />
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'read' | 'unread')}
              aria-label="Filter by status"
              className="max-w-[10rem]"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="admin-card min-w-0 overflow-hidden xl:col-span-2">
            <AdminDataTable
              columns={columns}
              rows={filteredEnquiries}
              rowKey={(e) => e.id}
              loading={loading}
              error={error}
              onRetry={() => void fetchEnquiries(true)}
              caption="Contact enquiries"
              emptyMessage="No enquiries found"
              emptyIcon={<MessageSquare className="h-12 w-12" />}
              tableClassName="admin-data-table--enquiries"
              onRowClick={(enquiry) => {
                setSelectedEnquiry(enquiry)
                if (!enquiry.is_read) void toggleReadStatus(enquiry)
              }}
              rowClassName={(enquiry) =>
                [
                  selectedEnquiry?.id === enquiry.id ? 'bg-primary-soft/40' : '',
                  !enquiry.is_read ? 'bg-warning-soft/30' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
            />

            <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--cm-color-border)] bg-[var(--cm-color-surface-muted)] px-4 py-3 sm:flex-row">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-[var(--cm-color-text-muted)]">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
                  entries
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-[var(--cm-color-text-muted)]" htmlFor="enq-limit">
                    Show:
                  </label>
                  <Select
                    id="enq-limit"
                    value={pagination.limit}
                    onChange={(e) =>
                      setPagination((p) => ({ ...p, limit: Number(e.target.value), page: 1 }))
                    }
                    className="max-w-[5rem]"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </Select>
                </div>
              </div>

              {pagination.totalPages > 1 ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPagination((p) => ({ ...p, page: 1 }))}
                    disabled={pagination.page <= 1}
                    className="admin-btn admin-btn--icon"
                    aria-label="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                    disabled={pagination.page <= 1}
                    className="admin-btn admin-btn--icon"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-sm text-[var(--cm-color-text-muted)]">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))
                    }
                    disabled={pagination.page >= pagination.totalPages}
                    className="admin-btn admin-btn--icon"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagination((p) => ({ ...p, page: p.totalPages }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="admin-btn admin-btn--icon"
                    aria-label="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="admin-card p-6">
            {selectedEnquiry ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[var(--cm-color-text)]">Enquiry Details</h2>
                  <span
                    className={`admin-badge ${selectedEnquiry.is_read ? 'admin-badge-success' : 'admin-badge-warning'}`}
                  >
                    {selectedEnquiry.is_read ? 'Read' : 'Unread'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg bg-[var(--cm-color-surface-muted)] p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary">
                      {selectedEnquiry.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--cm-color-text)]">{selectedEnquiry.full_name}</p>
                      <p className="text-sm text-[var(--cm-color-text-muted)]">Enquirer</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-[var(--cm-color-text-muted)]" />
                    <a href={`mailto:${selectedEnquiry.email}`} className="text-primary hover:underline">
                      {selectedEnquiry.email}
                    </a>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-[var(--cm-color-text-muted)]" />
                    <a href={`tel:${selectedEnquiry.phone}`} className="text-primary hover:underline">
                      {selectedEnquiry.phone}
                    </a>
                  </div>

                  {selectedEnquiry.course_name ? (
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-[var(--cm-color-text-muted)]" />
                      <span className="text-[var(--cm-color-text)]">{selectedEnquiry.course_name}</span>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-[var(--cm-color-text-muted)]" />
                    <span className="text-[var(--cm-color-text-muted)]">
                      {formatDate(selectedEnquiry.created_at)}
                    </span>
                  </div>
                </div>

                {selectedEnquiry.message ? (
                  <div className="mt-4 border-t border-[var(--cm-color-border)] pt-4">
                    <h3 className="mb-2 text-sm font-semibold text-[var(--cm-color-text)]">Message</h3>
                    <p className="whitespace-pre-wrap text-[var(--cm-color-text-muted)]">
                      {selectedEnquiry.message}
                    </p>
                  </div>
                ) : null}

                <div className="flex gap-2 pt-4">
                  <a
                    href={`mailto:${selectedEnquiry.email}`}
                    className="admin-btn admin-btn--primary flex-1 justify-center"
                  >
                    <Mail className="h-4 w-4" />
                    Reply via Email
                  </a>
                  <a href={`tel:${selectedEnquiry.phone}`} className="admin-btn admin-btn--secondary">
                    <Phone className="h-4 w-4" />
                    Call
                  </a>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="No enquiry selected"
                message="Select an enquiry from the list to view details."
                compact
              />
            )}
          </div>
        </div>
      </div>
    </AdminPageShell>
  )
}
