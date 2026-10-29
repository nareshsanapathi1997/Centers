'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText } from 'lucide-react'
import { studentFetch } from '@/lib/student-api'
import { useStudentPortal } from '@/components/student/StudentPortalContext'
import StudentPageFrame from '@/components/student/StudentPageFrame'
import StudentEmptyState from '@/components/student/StudentEmptyState'
import StudentErrorState from '@/components/student/StudentErrorState'

/**
 * Materials are no longer public files, so they must be fetched through the
 * authenticated endpoint and handed to the browser as a blob.
 */
async function downloadViaStudentApi(url: string, fileName: string) {
  const res = await studentFetch(url)
  if (!res.ok) return false
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = fileName
  a.click()
  URL.revokeObjectURL(objectUrl)
  return true
}

export default function StudentMaterialsPage() {
  const { centerId, centerSlug: slug } = useStudentPortal()
  const [downloadError, setDownloadError] = useState('')

  const materialsQuery = useQuery({
    queryKey: ['student', 'materials', centerId],
    queryFn: async () => {
      const r = await studentFetch(`/api/student/materials?centerId=${centerId}`)
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Unable to load materials')
      return (data.materials || []) as any[]
    },
  })

  const materials = materialsQuery.data ?? []
  const grouped = materials.reduce<Record<string, any[]>>((acc, m) => {
    const key = m.course_title || 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  return (
    <StudentPageFrame
      title="Study Materials"
      subtitle="Resources for your enrolled courses."
      breadcrumbs={[
        { label: 'Dashboard', href: `/${slug}/student/dashboard` },
        { label: 'Materials' },
      ]}
      loading={materialsQuery.isLoading}
      loadingLabel="Loading materials"
    >
      {materialsQuery.isError ? (
        <StudentErrorState
          error={materialsQuery.error}
          onRetry={() => void materialsQuery.refetch()}
        />
      ) : null}
      {downloadError ? (
        <div className="sp-alert sp-alert--error" role="alert">
          {downloadError}
        </div>
      ) : null}

      {!materialsQuery.isError && materials.length === 0 ? (
        <StudentEmptyState
          icon={FileText}
          title="No materials yet"
          message="Study materials for your courses will appear here when available."
          actionHref={`/${slug}/student/courses`}
          actionLabel="View my courses"
        />
      ) : null}

      {!materialsQuery.isError
        ? Object.entries(grouped).map(([courseTitle, items]) => {
            const courseMasterId = items[0]?.course_master_id
            return (
              <section key={courseTitle} className="sp-group">
                <div className="sp-group__head">
                  <h2>{courseTitle}</h2>
                  {courseMasterId ? (
                    <button
                      type="button"
                      className="sp-group__link"
                      onClick={async () => {
                        setDownloadError('')
                        const ok = await downloadViaStudentApi(
                          `/api/student/materials/download-zip?centerId=${centerId}&courseMasterId=${courseMasterId}`,
                          `${courseTitle.replace(/\s+/g, '-')}-materials.zip`
                        )
                        if (!ok) setDownloadError('Could not download ZIP. Please try again.')
                      }}
                    >
                      <Download aria-hidden /> Download all (ZIP)
                    </button>
                  ) : null}
                </div>
                <div className="sp-group__body">
                  {items.map((m) => (
                    <div key={m.id} className="sp-item">
                      <div className="sp-item__main">
                        <h3 className="sp-item__title">{m.title}</h3>
                        {m.description ? <p className="sp-item__desc">{m.description}</p> : null}
                        <div className="sp-item__meta">
                          <span className="sp-chip">{String(m.file_type || 'file').toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="sp-item__aside">
                        <button
                          type="button"
                          className="sp-btn sp-btn--primary sp-btn--sm"
                          onClick={async () => {
                            setDownloadError('')
                            const ok = await downloadViaStudentApi(
                              `/api/student/materials/download?centerId=${centerId}&materialId=${m.id}`,
                              `${(m.title || 'material').replace(/\s+/g, '-')}.${m.file_type || 'bin'}`
                            )
                            if (!ok) setDownloadError('Could not download file. Please try again.')
                          }}
                        >
                          <Download aria-hidden style={{ width: 16, height: 16, marginRight: 6 }} />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })
        : null}
    </StudentPageFrame>
  )
}
