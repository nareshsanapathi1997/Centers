'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowUpRight, BookOpen, CheckCircle2, CreditCard, Sparkles } from 'lucide-react'
import { studentFetch } from '@/lib/student-api'
import { useStudentPortal } from '@/components/student/StudentPortalContext'
import StudentPageFrame from '@/components/student/StudentPageFrame'
import StudentEmptyState from '@/components/student/StudentEmptyState'
import StudentErrorState from '@/components/student/StudentErrorState'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function StudentCoursesPage() {
  const { centerId, centerSlug: slug } = useStudentPortal()

  const coursesQuery = useQuery({
    queryKey: ['student', 'courses', centerId],
    queryFn: async () => {
      const r = await studentFetch(`/api/student/courses?centerId=${centerId}`)
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || 'Unable to load courses')
      return (data.courses || []) as any[]
    },
  })

  const courses = coursesQuery.data ?? []

  return (
    <StudentPageFrame
      title="My Courses"
      subtitle="Courses you are enrolled in based on your payments."
      breadcrumbs={[
        { label: 'Dashboard', href: `/${slug}/student/dashboard` },
        { label: 'Courses' },
      ]}
      loading={coursesQuery.isLoading}
      loadingLabel="Loading courses"
    >
      {coursesQuery.isError ? (
        <StudentErrorState
          error={coursesQuery.error}
          onRetry={() => void coursesQuery.refetch()}
        />
      ) : courses.length === 0 ? (
        <StudentEmptyState
          icon={BookOpen}
          title="No enrolled courses"
          message="Once you enroll or complete a payment, your courses will show up here."
          actionHref={`/${slug}/courses`}
          actionLabel="Browse courses on our website"
        />
      ) : (
        <div className="sp-course-grid">
          {courses.map((c) => (
            <article key={c.course_master_id} className="sp-course-card">
              <div className="sp-course-card__topline">
                <span className="sp-course-card__icon"><BookOpen aria-hidden /></span>
                <span className="sp-badge sp-badge--ok"><CheckCircle2 aria-hidden /> Enrolled</span>
              </div>
              <div className="sp-course-card__body">
                <p className="sp-course-card__eyebrow">Learning path</p>
                <h2>{c.course_title}</h2>
                {c.short_description ? <p>{c.short_description}</p> : <p>Continue with your enrolled learning path and keep your next revision session close.</p>}
                <div className="sp-course-card__meta">
                  <span><CreditCard aria-hidden /> Paid {formatCurrency(Number(c.total_paid || 0))}</span>
                  <span><Sparkles aria-hidden /> Workspace ready</span>
                </div>
              </div>
              {c.course_slug ? (
                <div className="sp-course-card__actions">
                  <Link href={`/${slug}/student/tutor`} className="sp-btn sp-btn--ghost sp-btn--sm">
                    Ask tutor <Sparkles aria-hidden />
                  </Link>
                  <Link
                    href={`/${slug}/program/${c.course_slug}`}
                    className="sp-btn sp-btn--secondary sp-btn--sm"
                  >
                    Open course <ArrowUpRight aria-hidden />
                  </Link>
                </div>
              ) : (
                <div className="sp-course-card__actions">
                  <Link href={`/${slug}/student/tutor`} className="sp-btn sp-btn--secondary sp-btn--sm">
                    Open study desk <ArrowUpRight aria-hidden />
                  </Link>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </StudentPageFrame>
  )
}
