'use client'

import { useQuery } from '@tanstack/react-query'
import { Layers } from 'lucide-react'
import { studentFetch } from '@/lib/student-api'
import { useStudentPortal } from '@/components/student/StudentPortalContext'
import StudentPageFrame from '@/components/student/StudentPageFrame'
import StudentEmptyState from '@/components/student/StudentEmptyState'
import StudentErrorState from '@/components/student/StudentErrorState'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(value).slice(0, 10)
  }
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function StudentBatchesPage() {
  const { centerId, centerSlug: slug } = useStudentPortal()

  const batchesQuery = useQuery({
    queryKey: ['student', 'batches', centerId],
    queryFn: async () => {
      const r = await studentFetch(`/api/student/batches?centerId=${centerId}`)
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Unable to load batches')
      return (data.batches || []) as Array<{
        id: number
        name: string
        code?: string | null
        status: string
        start_date?: string | null
        end_date?: string | null
        course_title?: string
        faculty_name?: string | null
      }>
    },
  })

  const batches = batchesQuery.data ?? []

  return (
    <StudentPageFrame
      title="My Batches"
      subtitle="Class batches you are enrolled in at this center."
      breadcrumbs={[
        { label: 'Dashboard', href: `/${slug}/student/dashboard` },
        { label: 'Batches' },
      ]}
      loading={batchesQuery.isLoading}
      loadingLabel="Loading batches"
    >
      {batchesQuery.isError ? (
        <StudentErrorState
          error={batchesQuery.error}
          onRetry={() => void batchesQuery.refetch()}
        />
      ) : batches.length === 0 ? (
        <StudentEmptyState
          icon={Layers}
          title="No batches yet"
          message="When your center enrolls you in a class batch, it will appear here."
        />
      ) : (
        <div className="sp-stack">
          {batches.map((b) => (
            <div key={b.id} className="sp-card-plain">
              <div className="sp-item" style={{ padding: 0, border: 0 }}>
                <div className="sp-item__main">
                  <h3 className="sp-item__title">{b.name}</h3>
                  {b.course_title ? <p className="sp-item__desc">{b.course_title}</p> : null}
                  <div className="sp-item__meta">
                    <span className="sp-chip">{statusLabel(b.status)}</span>
                    {b.code ? <span className="sp-chip">{b.code}</span> : null}
                    <span className="sp-chip">
                      {formatDate(b.start_date)} – {formatDate(b.end_date)}
                    </span>
                    {b.faculty_name ? <span className="sp-chip">{b.faculty_name}</span> : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentPageFrame>
  )
}
