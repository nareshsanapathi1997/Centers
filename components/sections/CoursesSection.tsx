'use client'
import { withBasePath } from '@/lib/with-base-path'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import CourseCategoryProgramLink from '@/components/CourseCategoryProgramLink'
import { getCourseCategoryIconClass } from '@/lib/course-category-icons'
import type { CenterCategoryGroup } from '@/lib/center-catalog-courses'
import { Course } from '@/types'

interface CoursesSectionProps {
  centerId: number
  slug: string
  collegeCourses: Course[]
  schoolCourses: Course[]
  categoryIdByCourseName?: Record<string, number>
  catalogCollegeTab?: CenterCategoryGroup[]
  catalogSchool?: CenterCategoryGroup[]
}

function categoryProgramCount(g: CenterCategoryGroup): number {
  if (typeof g.courseCount === 'number') return g.courseCount
  return g.courses.length
}

export default function CoursesSection({
  centerId,
  slug,
  collegeCourses,
  schoolCourses,
  categoryIdByCourseName = {},
  catalogCollegeTab = [],
  catalogSchool = [],
}: CoursesSectionProps) {
  const [overviewCourse, setOverviewCourse] = useState<Course | null>(null)
  const [tab, setTab] = useState<'college' | 'school'>('college')
  const [search, setSearch] = useState('')
  const useCatalogCategories = catalogCollegeTab.length > 0 || catalogSchool.length > 0

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', overviewCourse != null)
    return () => document.body.classList.remove('overflow-hidden')
  }, [overviewCourse])

  const trackClick = async (courseId: number) => {
    try {
      await fetch(withBasePath('/api/analytics/track'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerId,
          itemType: 'course',
          itemId: courseId,
          actionType: 'click',
        }),
      })
    } catch (error) {
      console.error('Error tracking click:', error)
    }
  }

  const trackTeemsCategory = async (categoryId: number | null) => {
    try {
      await fetch(withBasePath('/api/analytics/track'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerId,
          itemType: 'teems_category',
          itemId: categoryId ?? -1,
          actionType: 'click',
        }),
      })
    } catch {
      /* ignore */
    }
  }

  const categoryHref = (g: CenterCategoryGroup) => {
    if (g.course_category_id == null) return undefined
    if (!slug) return `/courses/${g.course_category_id}`
    return `/${slug}/category/${g.course_category_id}`
  }

  const query = search.trim().toLowerCase()
  const catalogItems = useMemo(() => {
    const source = tab === 'college' ? catalogCollegeTab : catalogSchool
    if (!query) return source
    return source.filter((g) => (g.course_category_name || '').toLowerCase().includes(query))
  }, [catalogCollegeTab, catalogSchool, query, tab])

  const legacyItems = useMemo(() => {
    const source = tab === 'college' ? collegeCourses : schoolCourses
    if (!query) return source
    return source.filter((course) => course.name.toLowerCase().includes(query))
  }, [collegeCourses, schoolCourses, query, tab])

  const collegeCount = useCatalogCategories ? catalogCollegeTab.length : collegeCourses.length
  const schoolCount = useCatalogCategories ? catalogSchool.length : schoolCourses.length
  const visibleCount = useCatalogCategories ? catalogItems.length : legacyItems.length
  const catalogueHref = slug ? `/${slug}#department` : '/#department'

  const renderCatalogTile = (g: CenterCategoryGroup, index: number) => {
    const href = categoryHref(g)
    const count = categoryProgramCount(g)
    const inner = (
      <>
        <span className="exam-tile__top">
          <span className="exam-tile__icon" aria-hidden>
            <i className={getCourseCategoryIconClass(g.course_category_name)} />
          </span>
          <span className="exam-tile__index">{String(index + 1).padStart(2, '0')}</span>
        </span>
        <h3 className="exam-tile__name">{g.course_category_name || 'Programs'}</h3>
        <p className="exam-tile__meta">
          {count > 0 ? `${count} programme${count === 1 ? '' : 's'}` : 'Explore category'}
        </p>
        <span className="exam-tile__go">
          Open <i className="ri-arrow-right-up-line" aria-hidden />
        </span>
      </>
    )

    return (
      <li key={`${g.course_category_id ?? 'x'}-${g.course_category_name ?? ''}`}>
        {href ? (
          <Link href={href} className="exam-tile" onClick={() => void trackTeemsCategory(g.course_category_id)}>
            {inner}
          </Link>
        ) : (
          <div className="exam-tile exam-tile--static">{inner}</div>
        )}
      </li>
    )
  }

  const renderLegacyTile = (course: Course, index: number) => (
    <li key={course.id}>
      <article className="exam-tile exam-tile--legacy">
        <CourseCategoryProgramLink
          centerSlug={slug}
          course={course}
          categoryIdByCourseName={categoryIdByCourseName}
          onTrackedClick={trackClick}
          className="exam-tile__link"
        >
          <span className="exam-tile__top">
            <span className="exam-tile__icon" aria-hidden>
              <i className={getCourseCategoryIconClass(course.name, course.icon_class)} />
            </span>
            <span className="exam-tile__index">{String(index + 1).padStart(2, '0')}</span>
          </span>
          <h3 className="exam-tile__name">{course.name}</h3>
          <p className="exam-tile__meta">View programmes and batches</p>
          <span className="exam-tile__go">
            Open <i className="ri-arrow-right-up-line" aria-hidden />
          </span>
        </CourseCategoryProgramLink>
        <button
          type="button"
          className="exam-tile__about"
          onClick={() => setOverviewCourse(course)}
        >
          About
        </button>
      </article>
    </li>
  )

  const emptyLabel =
    tab === 'college' ? 'No college programmes match this search.' : 'No school programmes match this search.'

  if (!useCatalogCategories && collegeCourses.length === 0 && schoolCourses.length === 0) {
    return null
  }

  return (
    <section id="department" className="pub-section premium-section premium-section--courses">
      <div className="pub-container">
        <div className="exam-dir">
          <header className="exam-dir__head">
            <div>
              <p className="pub-eyebrow">
                <i className="ri-book-open-line" aria-hidden />
                Programme directory
              </p>
              <h2>Choose the exam. We’ll map the route.</h2>
              <p>
                Every pathway in one board — pick the exam you are sitting, then open the programmes behind it.
              </p>
            </div>
            <div className="exam-dir__tools">
              <div className="pub-tabs course-level-tabs" role="tablist" aria-label="Course level">
                <button
                  type="button"
                  className={`pub-tab tab-link ${tab === 'college' ? 'is-active active' : ''}`}
                  role="tab"
                  aria-selected={tab === 'college'}
                  onClick={() => setTab('college')}
                >
                  College <small>{collegeCount}</small>
                </button>
                <button
                  type="button"
                  className={`pub-tab tab-link ${tab === 'school' ? 'is-active active' : ''}`}
                  role="tab"
                  aria-selected={tab === 'school'}
                  onClick={() => setTab('school')}
                >
                  School <small>{schoolCount}</small>
                </button>
              </div>
              <label className="exam-dir__search">
                <i className="ri-search-line" aria-hidden />
                <span className="sr-only">Search programmes</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search CAT, GATE, Bank…"
                />
              </label>
              <Link href={catalogueHref} className="pub-btn">
                Full catalogue <i className="ri-arrow-right-line" aria-hidden />
              </Link>
            </div>
          </header>

          <p className="exam-dir__count" role="status">
            {visibleCount} {visibleCount === 1 ? 'pathway' : 'pathways'}
            {query ? ` matching “${search.trim()}”` : ` in ${tab === 'college' ? 'college' : 'school'}`}
          </p>

          {visibleCount ? (
            <ol className="exam-dir__grid" aria-label={tab === 'college' ? 'College programmes' : 'School programmes'}>
              {useCatalogCategories
                ? catalogItems.map(renderCatalogTile)
                : legacyItems.map(renderLegacyTile)}
            </ol>
          ) : (
            <div className="exam-dir__empty">
              <i className="ri-search-line" aria-hidden />
              <p>{emptyLabel}</p>
              {query ? (
                <button type="button" className="pub-btn-ghost" onClick={() => setSearch('')}>
                  Clear search
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {overviewCourse ? (
        <div className="modal show d-block" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="mb-3 flex items-center justify-between">
                <h5 className="m-0 text-2xl">{overviewCourse.name}</h5>
                <button type="button" className="pub-icon-btn" aria-label="Close" onClick={() => setOverviewCourse(null)}>
                  <i className="ri-close-line" />
                </button>
              </div>
              {overviewCourse.description ? (
                <div className="whitespace-pre-wrap text-pub-muted">{overviewCourse.description}</div>
              ) : (
                <p className="text-pub-muted">No description available for this course.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
