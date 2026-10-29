'use client'

import { useQuery } from '@tanstack/react-query'
import { CalendarCheck } from 'lucide-react'
import { studentFetch } from '@/lib/student-api'
import { useStudentPortal } from '@/components/student/StudentPortalContext'
import StudentPageFrame from '@/components/student/StudentPageFrame'
import StudentEmptyState from '@/components/student/StudentEmptyState'
import StudentErrorState from '@/components/student/StudentErrorState'

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function StudentAttendancePage() {
  const { centerId, centerSlug: slug } = useStudentPortal()

  const attendanceQuery = useQuery({
    queryKey: ['student', 'attendance', centerId],
    queryFn: async () => {
      const r = await studentFetch(`/api/student/attendance?centerId=${centerId}`)
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Unable to load attendance')
      return data as {
        overall: {
          present_count: number
          absent_count: number
          late_count: number
          excused_count: number
          total_marked: number
          attendance_rate: number | null
        }
        byBatch: Array<{
          batch_id: number
          batch_name: string
          batch_code?: string | null
          course_title: string
          present_count: number
          absent_count: number
          late_count: number
          excused_count: number
          total_marked: number
          attendance_rate: number | null
          recent: Array<{
            attendance_date: string
            status: string
            notes?: string | null
          }>
        }>
      }
    },
  })

  const data = attendanceQuery.data
  const overall = data?.overall
  const byBatch = data?.byBatch ?? []

  return (
    <StudentPageFrame
      title="My Attendance"
      subtitle="Summary of your attendance across enrolled batches."
      breadcrumbs={[
        { label: 'Dashboard', href: `/${slug}/student/dashboard` },
        { label: 'Attendance' },
      ]}
      loading={attendanceQuery.isLoading}
      loadingLabel="Loading attendance"
    >
      {attendanceQuery.isError ? (
        <StudentErrorState
          error={attendanceQuery.error}
          onRetry={() => void attendanceQuery.refetch()}
        />
      ) : !overall || overall.total_marked === 0 ? (
        <StudentEmptyState
          icon={CalendarCheck}
          title="No attendance yet"
          message="Once your center marks attendance for your batches, your summary will show here."
        />
      ) : (
        <div className="sp-stack">
          <div className="sp-card-plain">
            <h3 className="sp-item__title">Overall</h3>
            <div className="sp-item__meta" style={{ marginTop: '0.75rem' }}>
              <span className="sp-chip">
                Rate{' '}
                {overall.attendance_rate != null ? `${overall.attendance_rate}%` : '—'}
              </span>
              <span className="sp-chip">Present {overall.present_count}</span>
              <span className="sp-chip">Absent {overall.absent_count}</span>
              <span className="sp-chip">Late {overall.late_count}</span>
              <span className="sp-chip">Excused {overall.excused_count}</span>
              <span className="sp-chip">Marked {overall.total_marked}</span>
            </div>
          </div>

          {byBatch.map((batch) => (
            <div key={batch.batch_id} className="sp-card-plain">
              <div className="sp-item" style={{ padding: 0, border: 0 }}>
                <div className="sp-item__main">
                  <h3 className="sp-item__title">{batch.batch_name}</h3>
                  <p className="sp-item__desc">{batch.course_title}</p>
                  <div className="sp-item__meta">
                    <span className="sp-chip">
                      Rate{' '}
                      {batch.attendance_rate != null ? `${batch.attendance_rate}%` : '—'}
                    </span>
                    <span className="sp-chip">P {batch.present_count}</span>
                    <span className="sp-chip">A {batch.absent_count}</span>
                    <span className="sp-chip">L {batch.late_count}</span>
                    <span className="sp-chip">E {batch.excused_count}</span>
                  </div>
                  {batch.recent.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-sm text-[var(--cm-color-text-muted)]">
                      {batch.recent.map((row) => (
                        <li key={`${batch.batch_id}-${row.attendance_date}`}>
                          {String(row.attendance_date).slice(0, 10)} · {statusLabel(row.status)}
                          {row.notes ? ` — ${row.notes}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentPageFrame>
  )
}
