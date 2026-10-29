'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarCheck, Save, Search } from 'lucide-react'
import { authenticatedFetch } from '@/lib/admin-api'
import { toast, confirmDialog } from '@/lib/admin-ui-store'
import { useAdminPermissions, hasAdminGrant } from '@/lib/use-admin-permissions'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminDataTable, { type AdminTableColumn } from '@/components/admin/AdminDataTable'
import AdminButton from '@/components/admin/AdminButton'
import Pagination from '@/components/admin/Pagination'
import PageHeader from '@/components/ui/PageHeader'
import { Input, Select } from '@/components/forms'
import {
  ATTENDANCE_STATUSES,
  type AttendanceDaySummary,
  type AttendanceRecordRow,
  type AttendanceRosterEntry,
  type AttendanceStatus,
} from '@/lib/attendance-types'
import type { CourseBatchRow } from '@/lib/course-batches-types'

type PageInfo = { page: number; pageSize: number; total: number; totalPages: number }
type Tab = 'mark' | 'history'

const PAGE_SIZE = 25

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'present':
      return 'inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300'
    case 'absent':
      return 'inline-flex rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300'
    case 'late':
      return 'inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300'
    case 'excused':
      return 'inline-flex rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300'
    default:
      return 'inline-flex rounded-full bg-zinc-500/15 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300'
  }
}

type DraftEntry = {
  studentId: number
  status: AttendanceStatus
  notes: string
}

export default function AdminAttendancePageClient({ centerId }: { centerId: string }) {
  const { access } = useAdminPermissions(centerId)
  const canCreate = hasAdminGrant(access, 'attendance', 'create')
  const canUpdate = hasAdminGrant(access, 'attendance', 'update')
  const canDelete = hasAdminGrant(access, 'attendance', 'delete')
  const canMark = canCreate || canUpdate

  const [tab, setTab] = useState<Tab>('mark')
  const [batches, setBatches] = useState<CourseBatchRow[]>([])
  const [batchId, setBatchId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterError, setRosterError] = useState<unknown>(null)
  const [roster, setRoster] = useState<AttendanceRosterEntry[]>([])
  const [drafts, setDrafts] = useState<Record<number, DraftEntry>>({})
  const [saving, setSaving] = useState(false)

  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<unknown>(null)
  const [records, setRecords] = useState<AttendanceRecordRow[]>([])
  const [days, setDays] = useState<AttendanceDaySummary[]>([])
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [status, setStatus] = useState('')
  const [historyBatchId, setHistoryBatchId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    authenticatedFetch(
      `/api/admin/batches?centerId=${centerId}&pageSize=200&status=active`,
      { headers: authHeaders() }
    )
      .then(async (res) => {
        if (!res.ok) {
          // also load non-active so upcoming batches can be marked
          const all = await authenticatedFetch(
            `/api/admin/batches?centerId=${centerId}&pageSize=200`,
            { headers: authHeaders() }
          )
          const data = await all.json().catch(() => ({}))
          setBatches(data.batches || [])
          return
        }
        const data = await res.json()
        const active = data.batches || []
        if (active.length > 0) {
          setBatches(active)
          return
        }
        const all = await authenticatedFetch(
          `/api/admin/batches?centerId=${centerId}&pageSize=200`,
          { headers: authHeaders() }
        )
        const allData = await all.json().catch(() => ({}))
        setBatches(allData.batches || [])
      })
      .catch(() => setBatches([]))
  }, [centerId])

  const loadRoster = useCallback(async () => {
    if (!batchId || !date) {
      setRoster([])
      setDrafts({})
      return
    }
    setRosterLoading(true)
    setRosterError(null)
    try {
      const qs = new URLSearchParams({ centerId, batchId, date })
      const res = await authenticatedFetch(`/api/admin/attendance/roster?${qs}`, {
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      const rows: AttendanceRosterEntry[] = data.roster || []
      setRoster(rows)
      const next: Record<number, DraftEntry> = {}
      for (const row of rows) {
        next[row.student_id] = {
          studentId: row.student_id,
          status: (row.status as AttendanceStatus) || 'present',
          notes: row.notes || '',
        }
      }
      setDrafts(next)
    } catch (err) {
      setRosterError(err)
      setRoster([])
      setDrafts({})
    } finally {
      setRosterLoading(false)
    }
  }, [centerId, batchId, date])

  useEffect(() => {
    if (tab === 'mark') void loadRoster()
  }, [tab, loadRoster])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const qs = new URLSearchParams({
        centerId,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      })
      if (search.trim()) qs.set('search', search.trim())
      if (status) qs.set('status', status)
      if (historyBatchId) qs.set('batchId', historyBatchId)
      if (dateFrom) qs.set('dateFrom', dateFrom)
      if (dateTo) qs.set('dateTo', dateTo)

      const res = await authenticatedFetch(`/api/admin/attendance?${qs}`, {
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      setRecords(data.records || [])
      setDays(data.days || [])
      setPageInfo(data.pagination || null)
    } catch (err) {
      setHistoryError(err)
      setRecords([])
      setDays([])
      setPageInfo(null)
    } finally {
      setHistoryLoading(false)
    }
  }, [centerId, page, search, status, historyBatchId, dateFrom, dateTo])

  useEffect(() => {
    if (tab === 'history') void loadHistory()
  }, [tab, loadHistory])

  const markAll = (statusValue: AttendanceStatus) => {
    setDrafts((prev) => {
      const next = { ...prev }
      for (const id of Object.keys(next)) {
        const sid = Number(id)
        next[sid] = { ...next[sid], status: statusValue }
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!batchId || !date) {
      toast.error('Select a batch and date')
      return
    }
    const entries = Object.values(drafts)
    if (entries.length === 0) {
      toast.error('No enrolled students to mark')
      return
    }
    setSaving(true)
    try {
      const res = await authenticatedFetch('/api/admin/attendance', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          centerId: Number(centerId),
          batchId: Number(batchId),
          attendanceDate: date,
          entries: entries.map((e) => ({
            studentId: e.studentId,
            status: e.status,
            notes: e.notes || undefined,
          })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Failed to save attendance')
        return
      }
      toast.success(`Saved attendance for ${data.saved} students`)
      void loadRoster()
    } catch {
      toast.error('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDay = async (day: AttendanceDaySummary) => {
    if (!canDelete) return
    const ok = await confirmDialog({
      title: 'Clear attendance day',
      message: `Delete all attendance for ${day.batch_name} on ${day.attendance_date}?`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    const res = await authenticatedFetch('/api/admin/attendance', {
      method: 'DELETE',
      headers: authHeaders(),
      body: JSON.stringify({
        centerId: Number(centerId),
        batchId: day.batch_id,
        attendanceDate: String(day.attendance_date).slice(0, 10),
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Delete failed')
      return
    }
    toast.success('Attendance day cleared')
    void loadHistory()
  }

  const rosterColumns: AdminTableColumn<AttendanceRosterEntry>[] = useMemo(
    () => [
      {
        key: 'student_name',
        header: 'Student',
        render: (r) => (
          <div>
            <div className="font-medium">{r.student_name}</div>
            <div className="text-xs text-[var(--cm-color-text-muted)]">
              {[r.student_regno, r.student_mobile].filter(Boolean).join(' · ') || '—'}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (r) => (
          <Select
            value={drafts[r.student_id]?.status || 'present'}
            onChange={(e) =>
              setDrafts((prev) => ({
                ...prev,
                [r.student_id]: {
                  studentId: r.student_id,
                  status: e.target.value as AttendanceStatus,
                  notes: prev[r.student_id]?.notes || '',
                },
              }))
            }
            disabled={!canMark}
            className="min-w-[8rem]"
          >
            {ATTENDANCE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </Select>
        ),
      },
      {
        key: 'notes',
        header: 'Notes',
        hideOnMobile: true,
        render: (r) => (
          <Input
            value={drafts[r.student_id]?.notes || ''}
            onChange={(e) =>
              setDrafts((prev) => ({
                ...prev,
                [r.student_id]: {
                  studentId: r.student_id,
                  status: prev[r.student_id]?.status || 'present',
                  notes: e.target.value,
                },
              }))
            }
            disabled={!canMark}
            placeholder="Optional"
          />
        ),
      },
    ],
    [drafts, canMark]
  )

  const historyColumns: AdminTableColumn<AttendanceRecordRow>[] = [
    {
      key: 'attendance_date',
      header: 'Date',
      render: (r) => String(r.attendance_date).slice(0, 10),
    },
    {
      key: 'batch_name',
      header: 'Batch',
      render: (r) => r.batch_name || '—',
    },
    {
      key: 'student_name',
      header: 'Student',
      render: (r) => r.student_name || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span className={statusBadgeClass(r.status)}>{statusLabel(r.status)}</span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      hideOnMobile: true,
      render: (r) => r.notes || '—',
    },
  ]

  return (
    <AdminPageShell>
      <PageHeader
        title="Attendance"
        description="Mark and review student attendance by academic batch and date."
        breadcrumbs={[
          { label: 'Dashboard', href: `/admin/${centerId}/dashboard` },
          { label: 'Attendance' },
        ]}
      />

      <div className="mb-4 flex gap-2 border-b border-[var(--cm-color-border)]">
        <button
          type="button"
          className={`px-3 py-2 text-sm font-medium ${
            tab === 'mark'
              ? 'border-b-2 border-primary text-[var(--cm-color-text)]'
              : 'text-[var(--cm-color-text-muted)]'
          }`}
          onClick={() => setTab('mark')}
        >
          Mark attendance
        </button>
        <button
          type="button"
          className={`px-3 py-2 text-sm font-medium ${
            tab === 'history'
              ? 'border-b-2 border-primary text-[var(--cm-color-text)]'
              : 'text-[var(--cm-color-text-muted)]'
          }`}
          onClick={() => setTab('history')}
        >
          History
        </button>
      </div>

      {tab === 'mark' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cm-color-text-muted)]">
                Batch
              </label>
              <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                <option value="">Select batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.code ? ` (${b.code})` : ''}
                    {b.course_title ? ` · ${b.course_title}` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--cm-color-text-muted)]">
                Date
              </label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2">
              {canMark ? (
                <>
                  <AdminButton type="button" variant="secondary" size="sm" onClick={() => markAll('present')}>
                    All present
                  </AdminButton>
                  <AdminButton type="button" variant="secondary" size="sm" onClick={() => markAll('absent')}>
                    All absent
                  </AdminButton>
                  <AdminButton
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving || !batchId}
                    icon={<Save className="h-4 w-4" />}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </AdminButton>
                </>
              ) : null}
            </div>
          </div>

          {!batchId ? (
            <div className="rounded-lg border border-dashed border-[var(--cm-color-border)] p-10 text-center text-[var(--cm-color-text-muted)]">
              <CalendarCheck className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>Select a batch and date to load the enrollment roster.</p>
            </div>
          ) : (
            <AdminDataTable
              columns={rosterColumns}
              rows={roster}
              rowKey={(r) => r.student_id}
              loading={rosterLoading}
              error={rosterError}
              onRetry={() => void loadRoster()}
              emptyMessage="No active enrollments in this batch. Add students from the batch detail page."
              emptyIcon={<CalendarCheck className="h-12 w-12" />}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cm-color-text-muted)]" />
              <Input
                className="pl-9"
                placeholder="Search student, batch…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1)
                    setSearch(searchDraft)
                  }
                }}
              />
            </div>
            <Select
              value={historyBatchId}
              onChange={(e) => {
                setPage(1)
                setHistoryBatchId(e.target.value)
              }}
              className="lg:w-56"
            >
              <option value="">All batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Select
              value={status}
              onChange={(e) => {
                setPage(1)
                setStatus(e.target.value)
              }}
              className="lg:w-36"
            >
              <option value="">All statuses</option>
              {ATTENDANCE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setPage(1)
                setDateFrom(e.target.value)
              }}
              className="lg:w-40"
              aria-label="From date"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setPage(1)
                setDateTo(e.target.value)
              }}
              className="lg:w-40"
              aria-label="To date"
            />
            <AdminButton
              type="button"
              variant="secondary"
              onClick={() => {
                setPage(1)
                setSearch(searchDraft)
              }}
            >
              Search
            </AdminButton>
          </div>

          {days.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {days.slice(0, 6).map((day) => (
                <div
                  key={`${day.batch_id}-${day.attendance_date}`}
                  className="rounded-lg border border-[var(--cm-color-border)] bg-[var(--cm-color-surface)] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--cm-color-text)]">
                        {day.batch_name}
                      </p>
                      <p className="text-xs text-[var(--cm-color-text-muted)]">
                        {String(day.attendance_date).slice(0, 10)}
                      </p>
                    </div>
                    {canDelete ? (
                      <AdminButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDeleteDay(day)}
                      >
                        Clear
                      </AdminButton>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs text-[var(--cm-color-text-muted)]">
                    P {day.present_count} · A {day.absent_count} · L {day.late_count} · E{' '}
                    {day.excused_count}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <AdminDataTable
            columns={historyColumns}
            rows={records}
            rowKey={(r) => r.id}
            loading={historyLoading}
            error={historyError}
            onRetry={() => void loadHistory()}
            emptyMessage="No attendance records match these filters."
            emptyIcon={<CalendarCheck className="h-12 w-12" />}
          />

          {pageInfo ? (
            <Pagination
              currentPage={page}
              totalPages={pageInfo.totalPages}
              totalItems={pageInfo.total}
              itemsPerPage={PAGE_SIZE}
              startIndex={(page - 1) * PAGE_SIZE}
              endIndex={(page - 1) * PAGE_SIZE + records.length}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      )}
    </AdminPageShell>
  )
}
