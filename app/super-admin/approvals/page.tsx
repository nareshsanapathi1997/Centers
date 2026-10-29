'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { superAdminFetch } from '@/lib/super-admin-api'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import AdminModal from '@/components/admin/AdminModal'
import AdminButton from '@/components/admin/AdminButton'
import AdminFormField from '@/components/admin/AdminFormField'
import Pagination from '@/components/admin/Pagination'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import { Input, Select } from '@/components/forms'
import { sanitizeCmsHtml } from '@/lib/sanitize-html'
import { toast, confirmDialog } from '@/lib/admin-ui-store'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Bell,
  AlertTriangle,
  Image as ImageIcon,
  Eye,
  Settings2,
} from 'lucide-react'

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50]

type ApprovalItem = {
  id: number
  item_type: 'news' | 'alert' | 'hero'
  title?: string
  content?: string
  message?: string
  center_name?: string
  created_at: string
  approval_status?: string
  is_notification?: boolean
  link_url?: string
}

export default function ApprovalsPage() {
  const pathname = usePathname()
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>(
    'pending'
  )
  const [typeFilter, setTypeFilter] = useState<'all' | 'news' | 'alerts' | 'hero'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null)
  const [previewItem, setPreviewItem] = useState<ApprovalItem | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [enabledSections, setEnabledSections] = useState<Record<string, boolean>>({
    news: true,
    alert: true,
    hero: true,
  })

  const fetchApprovalSettings = useCallback(async () => {
    try {
      const response = await superAdminFetch('/api/super-admin/approval-settings')
      if (response.ok) {
        const data = await response.json()
        const map: Record<string, boolean> = {}
        for (const section of data.sections || []) {
          map[section.key] = section.enabled
        }
        setEnabledSections(map)
      }
    } catch (error) {
      console.error('Error fetching approval settings:', error)
    }
  }, [])

  useEffect(() => {
    fetchApprovalSettings()
  }, [fetchApprovalSettings])

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      const response = await superAdminFetch(`/api/super-admin/approvals?status=${statusFilter}`)

      if (response.ok) {
        const data = await response.json()
        const combined = [
          ...(data.news || []).map((item: ApprovalItem) => ({ ...item, item_type: 'news' as const })),
          ...(data.alerts || []).map((item: ApprovalItem) => ({
            ...item,
            item_type: 'alert' as const,
          })),
          ...(data.hero || []).map((item: ApprovalItem) => ({ ...item, item_type: 'hero' as const })),
        ]
        setItems(combined)
      } else {
        setItems([])
      }
    } catch (error) {
      console.error('Error fetching approvals:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const isOnApprovalsPage = pathname === '/super-admin/approvals'

  useEffect(() => {
    if (!isOnApprovalsPage) return
    const id = setTimeout(() => fetchItems(), 50)
    return () => clearTimeout(id)
  }, [pathname, isOnApprovalsPage, fetchItems])

  const handleApprove = async (item: ApprovalItem) => {
    if (!(await confirmDialog(`Are you sure you want to approve this ${item.item_type}?`))) return

    setProcessingId(`${item.item_type}-${item.id}`)
    try {
      const response = await superAdminFetch(
        `/api/super-admin/approvals/${item.item_type}/${item.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'approve' }),
        }
      )

      if (response.ok) {
        fetchItems()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to approve item')
      }
    } catch (error) {
      console.error('Error approving item:', error)
      toast.error('Error approving item')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (reason: string) => {
    if (!selectedItem) return
    if (!reason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    setProcessingId(`${selectedItem.item_type}-${selectedItem.id}`)
    try {
      const response = await superAdminFetch(
        `/api/super-admin/approvals/${selectedItem.item_type}/${selectedItem.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'reject', rejection_reason: reason }),
        }
      )

      if (response.ok) {
        setShowRejectModal(false)
        setRejectionReason('')
        setSelectedItem(null)
        fetchItems()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to reject item')
      }
    } catch (error) {
      console.error('Error rejecting item:', error)
      toast.error('Error rejecting item')
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="admin-badge admin-badge-success inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="admin-badge admin-badge-danger inline-flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        )
      default:
        return (
          <span className="admin-badge admin-badge-warning inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.center_name?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'alerts' ? item.item_type === 'alert' : item.item_type === typeFilter)

      const sectionKey =
        item.item_type === 'news' ? 'news' : item.item_type === 'hero' ? 'hero' : 'alert'
      const sectionEnabled = enabledSections[sectionKey] !== false

      return matchesSearch && matchesType && sectionEnabled
    })
  }, [items, searchQuery, typeFilter, enabledSections])

  const totalFiltered = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages) || 1
  const startIdx = (safePage - 1) * itemsPerPage
  const paginatedItems = filteredItems.slice(startIdx, startIdx + itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, typeFilter, searchQuery, itemsPerPage])

  const columns: AdminTableColumn<ApprovalItem>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (item) =>
        item.item_type === 'news' ? (
          <span className="inline-flex items-center gap-1 text-primary">
            <Bell className="h-4 w-4" /> News
          </span>
        ) : item.item_type === 'hero' ? (
          <span className="inline-flex items-center gap-1 text-primary">
            <ImageIcon className="h-4 w-4" /> Hero
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-warning">
            <AlertTriangle className="h-4 w-4" /> Alert
          </span>
        ),
    },
    {
      key: 'title',
      header: 'Title',
      sortValue: (item) => item.title || item.message || '',
      render: (item) => (
        <span className="font-medium" title={item.title || item.message || ''}>
          {item.title || item.message?.substring(0, 50) || 'Hero Slide'}
        </span>
      ),
    },
    {
      key: 'center',
      header: 'Center',
      sortValue: (item) => item.center_name || '',
      hideOnMobile: true,
      render: (item) => (
        <span className="text-[var(--cm-color-text-muted)]">{item.center_name}</span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortValue: (item) => new Date(item.created_at),
      render: (item) => new Date(item.created_at).toLocaleDateString(),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (item) => item.approval_status || 'pending',
      render: (item) => getStatusBadge(item.approval_status || 'pending'),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex flex-wrap items-center justify-end gap-1">
          {item.item_type === 'news' ? (
            <button
              type="button"
              onClick={() => setPreviewItem(item)}
              className="admin-btn admin-btn--secondary admin-btn--xs"
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
          ) : null}
          {item.approval_status === 'pending' ? (
            <>
              <button
                type="button"
                onClick={() => handleApprove(item)}
                disabled={processingId === `${item.item_type}-${item.id}`}
                className="admin-btn admin-btn--success admin-btn--xs disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedItem(item)
                  setShowRejectModal(true)
                }}
                disabled={processingId === `${item.item_type}-${item.id}`}
                className="admin-btn admin-btn--danger admin-btn--xs disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
            </>
          ) : (
            <span className="text-[var(--cm-color-text-muted)]">—</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <SuperAdminPageShell>
      <div className="space-y-4">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-7 w-7" />
              Approvals
            </span>
          }
          description="Review and approve notifications and banners created by center admins"
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Approvals' },
          ]}
          actions={
            <Link
              href="/super-admin/settings/approvals"
              className="admin-btn admin-btn--secondary admin-btn--sm"
            >
              <Settings2 className="h-4 w-4" />
              Approval Settings
            </Link>
          }
        />

        <div className="admin-card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, content, or center..."
              aria-label="Search approvals"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              aria-label="Filter by status"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All</option>
            </Select>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              aria-label="Filter by type"
            >
              <option value="all">All Types</option>
              {enabledSections.news !== false ? (
                <option value="news">News/Notifications</option>
              ) : null}
              {enabledSections.alert !== false ? (
                <option value="alerts">Alerts/Banners</option>
              ) : null}
              {enabledSections.hero !== false ? <option value="hero">Hero Slider</option> : null}
            </Select>
            <Select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              aria-label="Items per page"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="admin-card overflow-hidden">
          {loading && items.length === 0 ? (
            <div className="p-6">
              <LoadingSkeleton variant="table" rows={6} />
            </div>
          ) : (
            <>
              <AdminDataTable
                columns={columns}
                rows={paginatedItems}
                rowKey={(item) => `${item.item_type}-${item.id}`}
                loading={loading}
                caption="Pending approvals"
                emptyMessage={
                  statusFilter === 'pending'
                    ? 'No pending approvals'
                    : 'No items match the selected filters'
                }
                emptyIcon={<Clock className="h-12 w-12" />}
              />
              {totalFiltered > itemsPerPage ? (
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  totalItems={totalFiltered}
                  itemsPerPage={itemsPerPage}
                  startIndex={startIdx}
                  endIndex={startIdx + paginatedItems.length}
                  onPageChange={setCurrentPage}
                />
              ) : null}
            </>
          )}
        </div>

        <AdminModal
          isOpen={Boolean(previewItem)}
          onClose={() => setPreviewItem(null)}
          title={
            previewItem
              ? `Preview: ${previewItem.is_notification ? 'Notification' : 'News'}`
              : 'Preview'
          }
          size="large"
          footer={
            <AdminButton type="button" variant="secondary" size="sm" onClick={() => setPreviewItem(null)}>
              Close
            </AdminButton>
          }
        >
          {previewItem ? (
            <>
              <p className="admin-form-hint mb-3">
                {previewItem.center_name} · {new Date(previewItem.created_at).toLocaleString()}
              </p>
              <h4 className="mb-3 text-lg font-semibold">{previewItem.title || 'Untitled'}</h4>
              {previewItem.content ? (
                previewItem.content.includes('<') ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-[var(--cm-color-text)]"
                    dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(previewItem.content) }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{previewItem.content}</p>
                )
              ) : (
                <p className="italic text-[var(--cm-color-text-muted)]">No content.</p>
              )}
              {previewItem.link_url ? (
                <p className="mt-3">
                  <a
                    href={previewItem.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {previewItem.link_url}
                  </a>
                </p>
              ) : null}
            </>
          ) : null}
        </AdminModal>

        <AdminModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false)
            setRejectionReason('')
            setRejectError('')
            setSelectedItem(null)
          }}
          title="Reject Item"
          description={
            selectedItem
              ? `Provide a reason for rejecting this ${selectedItem.item_type}.`
              : undefined
          }
          size="sm"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!rejectionReason.trim()) {
                setRejectError('Rejection reason is required.')
                return
              }
              setRejectError('')
              handleReject(rejectionReason)
            }}
          >
            <AdminFormField label="Reason" required error={rejectError}>
              <textarea
                value={rejectionReason}
                onChange={(e) => {
                  setRejectError('')
                  setRejectionReason(e.target.value)
                }}
                rows={4}
                className={`admin-form-control${rejectError ? ' admin-form-control--invalid' : ''}`}
                placeholder="Enter rejection reason..."
              />
            </AdminFormField>
            <div className="admin-btn-group admin-btn-group--end admin-modal__footer-actions">
              <AdminButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                  setRejectError('')
                  setSelectedItem(null)
                }}
              >
                Cancel
              </AdminButton>
              <AdminButton type="submit" variant="danger" size="sm">
                Reject
              </AdminButton>
            </div>
          </form>
        </AdminModal>
      </div>
    </SuperAdminPageShell>
  )
}
