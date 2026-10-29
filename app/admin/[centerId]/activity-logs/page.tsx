'use client'

import { useMemo, useState } from 'react'
import { useAdminFetch } from '@/lib/use-admin-fetch'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import AdminPageShell from '@/components/admin/AdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import { Input, Select } from '@/components/forms'
import { Activity, Filter, User, Building2, FileText } from 'lucide-react'

export default function ActivityLogs({ params }: { params: { centerId: string } }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  const logsPath = useMemo(() => {
    const queryParams = new URLSearchParams({
      centerId: params.centerId,
      limit: itemsPerPage.toString(),
      offset: ((currentPage - 1) * itemsPerPage).toString(),
    })
    if (filters.action) queryParams.append('action', filters.action)
    if (filters.entityType) queryParams.append('entityType', filters.entityType)
    return `/api/admin/activity-logs?${queryParams}`
  }, [params.centerId, currentPage, filters.action, filters.entityType])

  const { data: logsData, loading, error, refetch: fetchLogs } = useAdminFetch<any[]>(
    `admin-activity-logs-${params.centerId}-${currentPage}-${filters.action}-${filters.entityType}`,
    logsPath,
    { auth: true },
  )
  const logs = logsData ?? []

  // The endpoint returns a page, not a total, so paging is driven by whether the
  // page came back full rather than by a computed page count.
  const hasNextPage = logs.length === itemsPerPage

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-success-soft text-success dark:bg-success-soft dark:text-success',
      update: 'bg-info-soft text-info dark:bg-info-soft dark:text-info',
      delete: 'bg-danger-soft text-danger dark:bg-danger-soft dark:text-danger',
      login: 'bg-primary-soft text-primary dark:bg-primary-soft dark:text-primary',
      logout: 'bg-surface-muted text-[var(--cm-color-text)] dark:bg-surface-muted',
    }
    return colors[action] || 'bg-surface-muted text-[var(--cm-color-text)]'
  }

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'center':
        return <Building2 className="h-4 w-4" />
      case 'admin':
        return <User className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const filteredLogs = logs.filter(
    (log) =>
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const columns: AdminTableColumn<any>[] = [
    {
      key: 'created_at',
      header: 'Time',
      width: '13rem',
      sortValue: (log) => (log.created_at ? new Date(log.created_at) : null),
      render: (log) => (
        <span className="whitespace-nowrap text-sm text-[var(--cm-color-text)]">
          {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      width: '8rem',
      sortValue: (log) => log.action,
      render: (log) => (
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getActionColor(log.action)}`}>
          {log.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      sortValue: (log) => log.entity_type,
      render: (log) => (
        <div className="flex items-center gap-2 text-sm text-[var(--cm-color-text)]">
          {getEntityIcon(log.entity_type)}
          <span className="font-medium">{log.entity_type}</span>
          {log.entity_name && (
            <span className="text-[var(--cm-color-text-muted)]">- {log.entity_name}</span>
          )}
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      hideOnMobile: true,
      render: (log) => (
        <span className="text-sm text-[var(--cm-color-text-muted)]">
          {log.details ? JSON.stringify(log.details).substring(0, 100) : '-'}
        </span>
      ),
    },
  ]

  return (
    <AdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Activity Logs
            </span>
          }
          description="Track all actions and changes in your center"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Activity Logs' },
          ]}
        />

        <div className="admin-card p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search activity logs"
            />
            <Select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              aria-label="Filter by action"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </Select>
            <Select
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              aria-label="Filter by entity"
            >
              <option value="">All Entities</option>
              <option value="center">Center</option>
              <option value="course">Course</option>
              <option value="news">News</option>
              <option value="admin">Admin</option>
              <option value="hero">Hero</option>
            </Select>
            <button
              type="button"
              onClick={() => setFilters({ action: '', entityType: '', startDate: '', endDate: '' })}
              className="admin-btn admin-btn--sm flex items-center justify-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Clear Filters
            </button>
          </div>
        </div>

        <div className="admin-card overflow-hidden">
          <AdminDataTable
            columns={columns}
            rows={filteredLogs}
            rowKey={(log) => log.id}
            loading={loading}
            error={error}
            onRetry={() => void fetchLogs(true)}
            caption="Activity logs"
            emptyMessage="No activity logs found"
            emptyIcon={<Activity className="h-12 w-12" />}
          />

          {(currentPage > 1 || hasNextPage) && (
            <div className="flex items-center justify-between border-t border-[var(--cm-color-border)] px-6 py-4">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="admin-btn admin-btn--sm"
              >
                Previous
              </button>
              <span className="text-sm text-[var(--cm-color-text-muted)]">Page {currentPage}</span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!hasNextPage}
                className="admin-btn admin-btn--sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminPageShell>
  )
}
