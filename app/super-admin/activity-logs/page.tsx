'use client'

import { useEffect, useState } from 'react'
import { superAdminFetch } from '@/lib/super-admin-api'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import { Input, Select } from '@/components/forms'
import { Activity, Filter } from 'lucide-react'

type ActivityLog = {
  id: number
  created_at: string
  user_type: string
  user_id: number
  action: string
  entity_type?: string
  entity_name?: string
  details?: unknown
}

export default function SuperAdminActivityLogs() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [centers, setCenters] = useState<{ id: number; name: string }[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    centerId: '',
    userType: '',
    action: '',
    entityType: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  useEffect(() => {
    fetchCenters()
    fetchLogs()
  }, [currentPage, filters])

  const fetchCenters = async () => {
    try {
      const response = await superAdminFetch('/api/super-admin/centers')
      if (response.ok) {
        const data = await response.json()
        setCenters(data)
      }
    } catch (error) {
      console.error('Error fetching centers:', error)
    }
  }

  const fetchLogs = async () => {
    try {
      setLoading(true)

      const queryParams = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
      })

      if (filters.centerId) queryParams.append('centerId', filters.centerId)
      if (filters.userType) queryParams.append('userType', filters.userType)
      if (filters.action) queryParams.append('action', filters.action)
      if (filters.entityType) queryParams.append('entityType', filters.entityType)

      const response = await superAdminFetch(`/api/super-admin/activity-logs?${queryParams}`)

      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionBadge = (action: string) => {
    const map: Record<string, string> = {
      create: 'admin-badge-success',
      update: 'admin-badge-info',
      delete: 'admin-badge-danger',
      login: 'admin-badge',
    }
    return map[action] || 'admin-badge'
  }

  const filteredLogs = logs.filter(
    (log) =>
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns: AdminTableColumn<ActivityLog>[] = [
    {
      key: 'created_at',
      header: 'Time',
      sortValue: (log) => new Date(log.created_at),
      render: (log) => new Date(log.created_at).toLocaleString(),
    },
    {
      key: 'user',
      header: 'User',
      render: (log) => (
        <span>
          {log.user_type} #{log.user_id}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortValue: (log) => log.action,
      render: (log) => (
        <span className={`admin-badge ${getActionBadge(log.action)}`}>{log.action}</span>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (log) => (
        <span>
          {log.entity_type}
          {log.entity_name ? ` – ${log.entity_name}` : ''}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      hideOnMobile: true,
      render: (log) => (
        <span className="max-w-xs truncate block text-[var(--cm-color-text-muted)]">
          {log.details ? JSON.stringify(log.details).substring(0, 80) : '—'}
        </span>
      ),
    },
  ]

  return (
    <SuperAdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <Activity className="h-7 w-7" />
              Activity Logs
            </span>
          }
          description="Track all actions across all centers"
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Activity Logs' },
          ]}
        />

        <div className="admin-card p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <Input
              type="search"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search activity logs"
            />
            <Select
              value={filters.centerId}
              onChange={(e) => {
                setCurrentPage(1)
                setFilters({ ...filters, centerId: e.target.value })
              }}
              aria-label="Filter by center"
            >
              <option value="">All Centers</option>
              {centers.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name}
                </option>
              ))}
            </Select>
            <Select
              value={filters.userType}
              onChange={(e) => {
                setCurrentPage(1)
                setFilters({ ...filters, userType: e.target.value })
              }}
              aria-label="Filter by user type"
            >
              <option value="">All Users</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </Select>
            <Select
              value={filters.action}
              onChange={(e) => {
                setCurrentPage(1)
                setFilters({ ...filters, action: e.target.value })
              }}
              aria-label="Filter by action"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
            </Select>
            <button
              type="button"
              onClick={() => {
                setCurrentPage(1)
                setFilters({ centerId: '', userType: '', action: '', entityType: '' })
                setSearchTerm('')
              }}
              className="admin-btn admin-btn--secondary admin-btn--md"
            >
              <Filter className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>

        <div className="admin-card overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="p-6">
              <LoadingSkeleton variant="table" rows={8} />
            </div>
          ) : (
            <AdminDataTable
              columns={columns}
              rows={filteredLogs}
              rowKey={(log) => log.id}
              loading={loading}
              caption="Activity logs"
              emptyMessage="No activity logs found"
              emptyIcon={<Activity className="h-12 w-12" />}
            />
          )}
        </div>
      </div>
    </SuperAdminPageShell>
  )
}
