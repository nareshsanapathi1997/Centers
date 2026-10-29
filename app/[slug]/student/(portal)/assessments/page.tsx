'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { CheckCircle2, ClipboardList, Search, Sparkles, Timer, Trophy } from 'lucide-react'
import { studentFetch } from '@/lib/student-api'
import { useStudentPortal } from '@/components/student/StudentPortalContext'
import StudentPageFrame from '@/components/student/StudentPageFrame'
import StudentEmptyState from '@/components/student/StudentEmptyState'
import StudentErrorState from '@/components/student/StudentErrorState'

const MODE_LABELS: Record<string, string> = {
  practice: 'Practice',
  mock: 'Mock',
  live: 'Live',
}

function modeBadgeClass(mode: string) {
  if (mode === 'live') return 'sp-badge sp-badge--live'
  if (mode === 'mock') return 'sp-badge sp-badge--mock'
  return 'sp-badge sp-badge--practice'
}

export default function StudentAssessmentsPage() {
  const { centerId, centerSlug: slug } = useStudentPortal()
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('all')

  const assessmentsQuery = useQuery({
    queryKey: ['student', 'assessments', centerId],
    queryFn: async () => {
      const r = await studentFetch(`/api/student/assessments?centerId=${centerId}`)
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Unable to load assessments')
      return (data.assessments || []) as any[]
    },
  })

  const assessments = assessmentsQuery.data ?? []
  const filteredAssessments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return assessments.filter((assessment) => {
      const mode = String(assessment.mode || 'practice')
      const matchesMode = modeFilter === 'all' || mode === modeFilter
      const matchesSearch = !query || `${assessment.title} ${assessment.course_title} ${assessment.description || ''}`.toLowerCase().includes(query)
      return matchesMode && matchesSearch
    })
  }, [assessments, modeFilter, search])

  const summary = useMemo(() => {
    const completed = assessments.filter((a) => a.latest_score != null || (a.attempt_count || 0) > 0).length
    const inProgress = assessments.filter((a) => Boolean(a.in_progress_attempt_id)).length
    const scored = assessments.filter((a) => a.latest_score != null && Number(a.latest_max_score) > 0)
    const average = scored.length
      ? Math.round((scored.reduce((sum, a) => sum + (Number(a.latest_score) / Number(a.latest_max_score)) * 100, 0) / scored.length) * 10) / 10
      : null
    return { completed, inProgress, average }
  }, [assessments])

  const grouped = filteredAssessments.reduce<Record<string, any[]>>((acc, a) => {
    const key = a.course_title || 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <StudentPageFrame
      title="Quizzes & Exams"
      subtitle="Practice, mock tests, and live exams — including free assessments open to registered students."
      breadcrumbs={[
        { label: 'Dashboard', href: `/${slug}/student/dashboard` },
        { label: 'Quizzes & Exams' },
      ]}
      loading={assessmentsQuery.isLoading}
      loadingLabel="Loading assessments"
    >
      {assessmentsQuery.isError ? (
        <StudentErrorState
          error={assessmentsQuery.error}
          onRetry={() => void assessmentsQuery.refetch()}
        />
      ) : assessments.length === 0 ? (
        <StudentEmptyState
          icon={ClipboardList}
          title="No assessments yet"
          message="Free demos and course tests will appear here when published."
          actionHref={`/${slug}/student/courses`}
          actionLabel="View my courses"
        />
      ) : (
        <>
          <section className="sp-assessment-overview" aria-label="Assessment overview">
            <div className="sp-assessment-overview__card">
              <span className="sp-assessment-overview__icon"><ClipboardList aria-hidden /></span>
              <strong>{assessments.length}</strong>
              <span>Available</span>
            </div>
            <div className="sp-assessment-overview__card">
              <span className="sp-assessment-overview__icon"><CheckCircle2 aria-hidden /></span>
              <strong>{summary.completed}</strong>
              <span>Attempted</span>
            </div>
            <div className="sp-assessment-overview__card">
              <span className="sp-assessment-overview__icon"><Timer aria-hidden /></span>
              <strong>{summary.inProgress}</strong>
              <span>In progress</span>
            </div>
            <div className="sp-assessment-overview__card sp-assessment-overview__card--accent">
              <span className="sp-assessment-overview__icon"><Trophy aria-hidden /></span>
              <strong>{summary.average != null ? `${summary.average}%` : '—'}</strong>
              <span>Latest average</span>
            </div>
          </section>

          <section className="sp-assessment-tools" aria-label="Assessment filters">
            <label className="sp-search-field">
              <Search aria-hidden />
              <span className="sr-only">Search assessments</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title or course"
              />
            </label>
            <div className="sp-filter-tabs" role="group" aria-label="Filter by assessment mode">
              {['all', 'practice', 'mock', 'live'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`sp-filter-tab${modeFilter === mode ? ' is-active' : ''}`}
                  onClick={() => setModeFilter(mode)}
                  aria-pressed={modeFilter === mode}
                >
                  {mode === 'all' ? 'All' : MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </section>

          {filteredAssessments.length === 0 ? (
            <div className="sp-filter-empty">
              <Sparkles aria-hidden />
              <h2>No matching assessments</h2>
              <p>Try another search or switch back to all assessment types.</p>
              <button type="button" className="sp-btn sp-btn--ghost sp-btn--sm" onClick={() => { setSearch(''); setModeFilter('all') }}>
                Clear filters
              </button>
            </div>
          ) : null}

          {Object.entries(grouped).map(([courseTitle, items]) => (
          <section key={courseTitle} className="sp-group">
            <div className="sp-group__head">
              <h2>{courseTitle}</h2>
              <span className="sp-group__count">{items.length} {items.length === 1 ? 'assessment' : 'assessments'}</span>
            </div>
            <div className="sp-group__body">
              {items.map((a) => {
                const attemptsLeft = Math.max(0, (a.max_attempts || 1) - (a.attempt_count || 0))
                const canContinue = Boolean(a.in_progress_attempt_id)
                const canStart = attemptsLeft > 0 || canContinue
                const mode = String(a.mode || 'practice')
                const href = `/${slug}/student/exam/${a.id}${
                  canContinue ? `?attemptId=${a.in_progress_attempt_id}` : ''
                }`

                return (
                  <div key={a.id} className="sp-item">
                    <div className="sp-item__main">
                      <div className="sp-item__title-row">
                        <h3 className="sp-item__title">{a.title}</h3>
                        <span className={modeBadgeClass(mode)}>{MODE_LABELS[mode] || mode}</span>
                        {a.is_free ? <span className="sp-badge sp-badge--free">Free</span> : null}
                      </div>
                      {a.description ? <p className="sp-item__desc">{a.description}</p> : null}
                      <div className="sp-item__meta">
                        <span className="sp-chip">{a.duration_minutes} min</span>
                        <span className="sp-chip">{a.question_count || 0} questions</span>
                        <span className="sp-chip">
                          {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left
                        </span>
                        {a.latest_score != null ? (
                          <span className="sp-chip">
                            Last score {a.latest_score}/{a.latest_max_score ?? '—'}
                          </span>
                        ) : null}
                      </div>
                      {mode === 'live' && a.starts_at ? (
                        <p className="sp-item__note">
                          Window {new Date(a.starts_at).toLocaleString('en-IN')}
                          {a.ends_at ? ` – ${new Date(a.ends_at).toLocaleString('en-IN')}` : ''}
                        </p>
                      ) : null}
                    </div>
                    <div className="sp-item__aside">
                      <Link
                        href={href}
                        prefetch
                        className={
                          canStart
                            ? 'sp-btn sp-btn--primary sp-btn--sm'
                            : 'sp-btn sp-btn--ghost sp-btn--sm'
                        }
                      >
                        {canContinue ? 'Continue' : canStart ? 'Start' : 'Review'}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
          ))}
        </>
      )}
    </StudentPageFrame>
  )
}
