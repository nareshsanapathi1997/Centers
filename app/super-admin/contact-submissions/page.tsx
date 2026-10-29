'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { superAdminFetch } from '@/lib/super-admin-api'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import { Input, Select } from '@/components/forms'
import { Inbox, Mail, Building2, ChevronRight } from 'lucide-react'

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

interface CenterSummary {
  id: number
  name: string
  slug: string
  total_submissions: number
  unread_count: number
}

export default function ContactSubmissionsPage() {
  const router = useRouter()
  const [, setSubmissions] = useState<ContactSubmission[]>([])
  const [centerSummary, setCenterSummary] = useState<CenterSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCenter, setSelectedCenter] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })

  useEffect(() => {
    fetchSubmissions()
  }, [selectedCenter, pagination.page])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })
      if (selectedCenter) {
        params.append('centerId', selectedCenter.toString())
      }

      const response = await superAdminFetch(`/api/super-admin/contact-submissions?${params}`)

      if (response.ok) {
        const data = await response.json()
        setSubmissions(data.submissions)
        setCenterSummary(data.centerSummary)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const navigateToCenterDetail = (centerId: number) => {
    router.push(`/super-admin/contact-submissions/${centerId}`)
  }

  const filteredCenterSummary = centerSummary.filter((center) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return center.name.toLowerCase().includes(term) || center.slug.toLowerCase().includes(term)
    }
    return true
  })

  const visibleCenters = filteredCenterSummary.filter(
    (center) => !selectedCenter || center.id === selectedCenter
  )

  const totalSubmissions = centerSummary.reduce(
    (sum, center) => sum + parseInt(center.total_submissions as unknown as string),
    0
  )
  const totalUnread = centerSummary.reduce(
    (sum, center) => sum + parseInt(center.unread_count as unknown as string),
    0
  )

  const columns: AdminTableColumn<CenterSummary>[] = [
    {
      key: 'name',
      header: 'Center',
      sortValue: (c) => c.name,
      render: (center) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--cm-color-surface-muted)]">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium">{center.name}</span>
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      sortValue: (c) => c.slug,
      cellClassName: 'text-[var(--cm-color-text-muted)]',
      render: (c) => c.slug,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortValue: (c) => Number(c.total_submissions),
      render: (c) => c.total_submissions,
    },
    {
      key: 'unread',
      header: 'Unread',
      align: 'right',
      sortValue: (c) => Number(c.unread_count),
      render: (center) =>
        parseInt(center.unread_count as unknown as string) > 0 ? (
          <span className="admin-badge admin-badge-warning">{center.unread_count}</span>
        ) : (
          <span className="text-[var(--cm-color-text-muted)]">0</span>
        ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (center) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            navigateToCenterDetail(center.id)
          }}
          className="admin-btn admin-btn--primary admin-btn--sm"
        >
          View
          <ChevronRight className="h-4 w-4" />
        </button>
      ),
    },
  ]

  return (
    <SuperAdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <Inbox className="h-7 w-7" />
              Contact Submissions
            </span>
          }
          description="Contact form submissions across all centers"
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Contact Submissions' },
          ]}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="admin-card flex items-center gap-3 p-4">
            <Inbox className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalSubmissions}</p>
              <p className="text-sm text-[var(--cm-color-text-muted)]">Total submissions</p>
            </div>
          </div>
          <div className="admin-card flex items-center gap-3 p-4">
            <Mail className="h-8 w-8 text-warning" />
            <div>
              <p className="text-2xl font-bold">{totalUnread}</p>
              <p className="text-sm text-[var(--cm-color-text-muted)]">Unread</p>
            </div>
          </div>
          <div className="admin-card flex items-center gap-3 p-4">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{centerSummary.length}</p>
              <p className="text-sm text-[var(--cm-color-text-muted)]">Active centers</p>
            </div>
          </div>
        </div>

        <div className="admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="max-w-md flex-1">
            <Input
              type="search"
              placeholder="Search centers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search centers"
            />
          </div>
          <Select
            value={selectedCenter || ''}
            onChange={(e) => {
              setSelectedCenter(e.target.value ? parseInt(e.target.value) : null)
              setPagination({ ...pagination, page: 1 })
            }}
            className="max-w-xs"
            aria-label="Filter by center"
          >
            <option value="">All Centers</option>
            {centerSummary.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name} ({center.total_submissions})
              </option>
            ))}
          </Select>
        </div>

        <div className="admin-card overflow-hidden">
          {loading && centerSummary.length === 0 ? (
            <div className="p-6">
              <LoadingSkeleton variant="table" rows={6} />
            </div>
          ) : (
            <AdminDataTable
              columns={columns}
              rows={visibleCenters}
              rowKey={(c) => c.id}
              loading={loading}
              onRowClick={(center) => navigateToCenterDetail(center.id)}
              caption="Contact submissions by center"
              emptyMessage={
                searchTerm
                  ? 'No centers match your search criteria.'
                  : selectedCenter
                    ? 'This center has no contact form submissions yet.'
                    : 'No contact form submissions have been received yet.'
              }
              emptyIcon={<Inbox className="h-12 w-12" />}
            />
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="admin-card flex items-center justify-between px-6 py-4">
            <div className="text-sm text-[var(--cm-color-text-muted)]">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} submissions
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="admin-btn admin-btn--sm"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.totalPages}
                className="admin-btn admin-btn--sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </SuperAdminPageShell>
  )
}
