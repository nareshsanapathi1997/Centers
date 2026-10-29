'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowUpRight, BookOpen, CalendarCheck, CalendarClock, CheckCircle2, ClipboardList, CreditCard, IndianRupee, Sparkles, Target } from 'lucide-react'
import { studentFetch } from '@/lib/student-api'
import { useStudentPortal } from '@/components/student/StudentPortalContext'
import StudentPageFrame from '@/components/student/StudentPageFrame'
import StudentErrorState from '@/components/student/StudentErrorState'
import StudentEmptyState from '@/components/student/StudentEmptyState'
import { AnimatedCounter } from '@/components/animation'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function StudentDashboardPage() {
  const { centerId, centerSlug: slug, student } = useStudentPortal()

  const dashboardQuery = useQuery({
    queryKey: ['student', 'dashboard', centerId],
    queryFn: async () => {
      const r = await studentFetch(`/api/student/dashboard?centerId=${centerId}`)
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Unable to load dashboard')
      return data.stats ?? null
    },
  })

  const assessmentsQuery = useQuery({
    queryKey: ['student', 'assessments', centerId],
    queryFn: async () => {
      const r = await studentFetch(`/api/student/assessments?centerId=${centerId}`)
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Unable to load assessments')
      return (data.assessments || []) as Array<{
        id: number
        title: string
        mode?: string
        in_progress_attempt_id?: number | null
        max_attempts?: number
        attempt_count?: number
        latest_score?: number | null
        latest_max_score?: number | null
      }>
    },
  })

  const attendanceQuery = useQuery({
    queryKey: ['student', 'attendance', centerId],
    queryFn: async () => {
      const r = await studentFetch(`/api/student/attendance?centerId=${centerId}`)
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Unable to load attendance')
      return data as {
        overall?: { attendance_rate: number | null; total_marked: number }
      }
    },
  })

  const stats = dashboardQuery.data
  const upcomingAssessments = (assessmentsQuery.data ?? [])
    .filter((a) => {
      const attemptsLeft = Math.max(0, (a.max_attempts || 1) - (a.attempt_count || 0))
      return attemptsLeft > 0 || Boolean(a.in_progress_attempt_id)
    })
    .slice(0, 3)

  const enrolled = stats?.enrolledCourses ?? 0
  const pending = stats?.pendingInstallments ?? 0
  const progressDenom = enrolled + pending
  const progressPct = progressDenom > 0 ? Math.round((enrolled / progressDenom) * 100) : 0

  const assessmentStats = useMemo(() => {
    const rows = assessmentsQuery.data ?? []
    const completed = rows.filter((a) => a.latest_score != null || (a.attempt_count || 0) > 0).length
    const inProgress = rows.filter((a) => Boolean(a.in_progress_attempt_id)).length
    const scored = rows.filter((a) => a.latest_score != null && Number(a.latest_max_score) > 0)
    const average = scored.length
      ? Math.round(
          (scored.reduce((sum, a) => sum + (Number(a.latest_score) / Number(a.latest_max_score)) * 100, 0) /
            scored.length) *
            10
        ) / 10
      : null
    return { available: rows.length, completed, inProgress, average }
  }, [assessmentsQuery.data])

  const cards = [
    {
      label: 'Enrolled Courses',
      numeric: enrolled,
      display: null as string | null,
      icon: BookOpen,
      href: `/${slug}/student/courses`,
    },
    {
      label: 'Total Payments',
      numeric: stats?.totalPayments ?? 0,
      display: null,
      icon: CreditCard,
      href: `/${slug}/student/payments`,
    },
    {
      label: 'Amount Paid',
      numeric: stats?.totalPaid ?? 0,
      display: formatCurrency(stats?.totalPaid ?? 0),
      icon: IndianRupee,
      href: `/${slug}/student/payments`,
    },
    {
      label: 'Pending Installments',
      numeric: pending,
      display: null,
      icon: CalendarClock,
      href: `/${slug}/student/installments`,
    },
  ]

  const hasActivity =
    enrolled > 0 ||
    (stats?.totalPayments ?? 0) > 0 ||
    pending > 0 ||
    Boolean(stats?.upcomingDue) ||
    (stats?.recentPayments?.length ?? 0) > 0 ||
    upcomingAssessments.length > 0 ||
    Boolean(attendanceQuery.data?.overall?.total_marked)

  return (
    <StudentPageFrame
      className="sp-dash"
      title="Welcome back"
      subtitle="Your progress, upcoming work, and everything you need for a productive day."
      breadcrumbs={[{ label: 'Dashboard' }]}
      loading={dashboardQuery.isLoading}
      loadingLabel="Loading dashboard"
    >
      {dashboardQuery.isError ? (
        <StudentErrorState
          error={dashboardQuery.error}
          onRetry={() => void dashboardQuery.refetch()}
        />
      ) : (
        <>
          <section className="sp-dashboard-welcome" aria-labelledby="sp-welcome-heading">
            <div className="sp-dashboard-welcome__copy">
              <p className="sp-dashboard-welcome__eyebrow"><Sparkles aria-hidden /> Your learning workspace</p>
              <h2 id="sp-welcome-heading">
                {student?.fullName ? `Good to see you, ${student.fullName.split(' ')[0]}.` : 'Your next step is ready.'}
              </h2>
              <p>Keep your momentum with a quick review, a focused practice session, or a question for your tutor.</p>
              <div className="sp-dashboard-welcome__actions">
                <Link href={`/${slug}/student/tutor`} className="sp-btn sp-btn--primary sp-btn--sm">
                  Open AI Tutor <ArrowUpRight aria-hidden />
                </Link>
                <Link href={`/${slug}/student/assessments`} className="sp-btn sp-btn--ghost sp-btn--sm">
                  Practice now
                </Link>
              </div>
            </div>
            <div className="sp-dashboard-welcome__pulse" aria-label="Learning pulse">
              <div className="sp-dashboard-welcome__pulse-head">
                <span>Learning pulse</span>
                <Target aria-hidden />
              </div>
              <div className="sp-dashboard-welcome__pulse-value">
                {assessmentStats.average != null ? `${assessmentStats.average}%` : '—'}
              </div>
              <p>{assessmentStats.average != null ? 'average latest assessment score' : 'complete a test to unlock score trends'}</p>
              <div className="sp-dashboard-welcome__pulse-meta">
                <span><CheckCircle2 aria-hidden /> {assessmentStats.completed} completed</span>
                <span><CalendarCheck aria-hidden /> {attendanceQuery.data?.overall?.attendance_rate != null ? `${attendanceQuery.data.overall.attendance_rate}% attendance` : 'Attendance updates live'}</span>
              </div>
            </div>
          </section>

          <section className="sp-dash__section" aria-labelledby="sp-progress-heading">
            <h2 id="sp-progress-heading" className="sp-section-label">
              Progress
            </h2>
            <div className="sp-dash__grid cm-stagger">
              {cards.map(({ label, numeric, display, icon: Icon, href }, index) => (
                <Link
                  key={label}
                  href={href}
                  className="sp-stat-card cm-stagger__item"
                  style={{ ['--cm-i' as string]: index }}
                >
                  <span className="sp-stat-card__icon">
                    <Icon aria-hidden />
                  </span>
                  <p className="sp-stat-card__value">
                    {display ?? <AnimatedCounter value={numeric} />}
                  </p>
                  <p className="sp-stat-card__label">{label}</p>
                </Link>
              ))}
            </div>
            {progressDenom > 0 ? (
              <div className="sp-progress" aria-label="Enrollment versus pending dues">
                <div className="sp-progress__bar" style={{ width: `${progressPct}%` }} />
                <p className="sp-progress__caption">
                  {enrolled} enrolled · {pending} installment{pending === 1 ? '' : 's'} pending
                </p>
              </div>
            ) : null}
          </section>

          <section className="sp-dash__section" aria-labelledby="sp-insights-heading">
            <div className="sp-section-heading">
              <div>
                <p className="sp-section-kicker">Signals</p>
                <h2 id="sp-insights-heading">A clearer view of your week</h2>
              </div>
              <Link href={`/${slug}/student/attendance`} className="sp-btn sp-btn--link">
                View attendance →
              </Link>
            </div>
            <div className="sp-insight-grid">
              <Link href={`/${slug}/student/assessments`} className="sp-insight-card">
                <span className="sp-insight-card__icon"><ClipboardList aria-hidden /></span>
                <span className="sp-insight-card__value">{assessmentStats.available}</span>
                <span className="sp-insight-card__label">Assessments available</span>
                <span className="sp-insight-card__meta">{assessmentStats.inProgress ? `${assessmentStats.inProgress} in progress` : 'Pick one to build momentum'} <ArrowUpRight aria-hidden /></span>
              </Link>
              <Link href={`/${slug}/student/attendance`} className="sp-insight-card sp-insight-card--accent">
                <span className="sp-insight-card__icon"><CalendarCheck aria-hidden /></span>
                <span className="sp-insight-card__value">{attendanceQuery.data?.overall?.attendance_rate != null ? `${attendanceQuery.data.overall.attendance_rate}%` : '—'}</span>
                <span className="sp-insight-card__label">Attendance rate</span>
                <span className="sp-insight-card__meta">{attendanceQuery.data?.overall?.total_marked ? `${attendanceQuery.data.overall.total_marked} sessions marked` : 'Your centre will update this'} <ArrowUpRight aria-hidden /></span>
              </Link>
              <Link href={`/${slug}/student/tutor`} className="sp-insight-card sp-insight-card--dark">
                <span className="sp-insight-card__icon"><Sparkles aria-hidden /></span>
                <span className="sp-insight-card__value">Ask</span>
                <span className="sp-insight-card__label">Your study companion</span>
                <span className="sp-insight-card__meta">Plan a focused session <ArrowUpRight aria-hidden /></span>
              </Link>
            </div>
          </section>

          {!hasActivity ? (
            <StudentEmptyState
              icon={BookOpen}
              title="Your learning hub is ready"
              message="Enroll in a course or complete a payment to see activity here."
              actionHref={`/${slug}`}
              actionLabel="Browse courses"
            />
          ) : null}

          {stats?.upcomingDue ? (
            <section className="sp-dash__section" aria-labelledby="sp-upcoming-heading">
              <h2 id="sp-upcoming-heading" className="sp-section-label">
                Upcoming
              </h2>
              <div className="sp-banner">
                <h3>Installment due</h3>
                <p>
                  {stats.upcomingDue.course_title} — Installment #{stats.upcomingDue.installment_no}:{' '}
                  {formatCurrency(Number(stats.upcomingDue.amount))} due on{' '}
                  {new Date(stats.upcomingDue.due_date).toLocaleDateString('en-IN')}
                </p>
                <div className="sp-banner__actions">
                  {(stats.upcomingDue.course_slug || stats.upcomingDue.course_master_id) && (
                    <Link
                      href={`/${slug}/payment/${stats.upcomingDue.course_slug || stats.upcomingDue.course_master_id}`}
                      className="sp-btn sp-btn--primary"
                    >
                      Pay now
                    </Link>
                  )}
                  <Link href={`/${slug}/student/installments`} className="sp-btn sp-btn--link">
                    View all installments →
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          {upcomingAssessments.length > 0 ? (
            <section className="sp-dash__section" aria-labelledby="sp-assess-heading">
              <div className="sp-panel">
                <div className="sp-panel__head">
                  <h2 id="sp-assess-heading">Assessments</h2>
                  <Link href={`/${slug}/student/assessments`} className="sp-btn sp-btn--link">
                    View all
                  </Link>
                </div>
                <div className="sp-panel__body">
                  {upcomingAssessments.map((a) => (
                    <div key={a.id} className="sp-panel__row">
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>{a.title}</p>
                        <p className="sp-item__desc" style={{ margin: '2px 0 0' }}>
                          {a.in_progress_attempt_id ? 'In progress' : a.mode || 'Practice'}
                        </p>
                      </div>
                      <Link
                        href={`/${slug}/student/exam/${a.id}${
                          a.in_progress_attempt_id ? `?attemptId=${a.in_progress_attempt_id}` : ''
                        }`}
                        className="sp-btn sp-btn--secondary sp-btn--sm"
                      >
                        {a.in_progress_attempt_id ? 'Continue' : 'Start'}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : assessmentsQuery.isSuccess && (assessmentsQuery.data?.length ?? 0) === 0 && hasActivity ? (
            <section className="sp-dash__section">
              <StudentEmptyState
                icon={ClipboardList}
                title="No assessments yet"
                message="Published quizzes and exams will appear here."
              />
            </section>
          ) : null}

          {stats?.recentPayments?.length > 0 ? (
            <section className="sp-dash__section" aria-labelledby="sp-pay-heading">
              <div className="sp-panel">
                <div className="sp-panel__head">
                  <h2 id="sp-pay-heading">Payments</h2>
                  <Link href={`/${slug}/student/payments`} className="sp-btn sp-btn--link">
                    History
                  </Link>
                </div>
                <div className="sp-panel__body">
                  {stats.recentPayments.map((p: { id: number; course_title?: string; receipt_no?: string; created_at: string; amount_paid: number }) => (
                    <div key={p.id} className="sp-panel__row">
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>{p.course_title || 'Course payment'}</p>
                        <p
                          style={{
                            margin: '2px 0 0',
                            color: 'var(--sp-text-muted)',
                            fontSize: '0.8125rem',
                          }}
                        >
                          {p.receipt_no} · {new Date(p.created_at).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--sp-success)' }}>
                        {formatCurrency(Number(p.amount_paid))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}
    </StudentPageFrame>
  )
}
