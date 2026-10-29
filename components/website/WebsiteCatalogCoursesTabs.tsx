'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getCourseCategoryIconClass } from '@/lib/course-category-icons'
import type { CenterCategoryGroup } from '@/lib/center-catalog-courses'

type Props = {
  collegeTab: CenterCategoryGroup[]
  school: CenterCategoryGroup[]
  idPrefix?: string
  showViewAllLink?: boolean
}

const count = (g: CenterCategoryGroup) =>
  typeof g.courseCount === 'number' ? g.courseCount : g.courses.length

export default function WebsiteCatalogCoursesTabs({
  collegeTab,
  school,
  idPrefix = 'website-courses',
  showViewAllLink = false,
}: Props) {
  const [level, setLevel] = useState<'college' | 'school'>(collegeTab.length ? 'college' : 'school')
  const [search, setSearch] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)

  const groups = (level === 'college' ? collegeTab : school)
    .filter(
      (g) =>
        (g.course_category_name || '').toLowerCase().includes(search.trim().toLowerCase()) &&
        (!availableOnly || count(g) > 0)
    )
    .slice()
    .sort((a, b) => Number(count(b) > 0) - Number(count(a) > 0))

  return (
    <div className="exam-dir chapter-catalog">
      <div className="exam-dir__tools chapter-discovery-toolbar">
        <div className="pub-tabs course-level-tabs" role="tablist" aria-label="Course level">
          {(['college', 'school'] as const).map((key) => (
            <button
              key={key}
              id={`${idPrefix}-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={level === key}
              aria-controls={`${idPrefix}-panel`}
              tabIndex={level === key ? 0 : -1}
              className={`pub-tab tab-link${level === key ? ' is-active active' : ''}`}
              onClick={() => setLevel(key)}
            >
              {key === 'college' ? 'College' : 'School'}{' '}
              <small>{key === 'college' ? collegeTab.length : school.length}</small>
            </button>
          ))}
        </div>
        <label className="exam-dir__search chapter-search">
          <i className="ri-search-line" aria-hidden />
          <span className="sr-only visually-hidden">Search programmes</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search CAT, GATE, Bank…"
          />
        </label>
        <label className="exam-dir__filter">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
          />
          With programmes
        </label>
      </div>

      <p className="exam-dir__count" role="status">
        {groups.length} {groups.length === 1 ? 'pathway' : 'pathways'} to explore
      </p>

      <div role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${level}`}>
        {groups.length ? (
          <ol className="exam-dir__grid chapter-course-grid">
            {groups.map((g, index) => {
              const total = count(g)
              const inner = (
                <>
                  <span className="exam-tile__top">
                    <span className="exam-tile__icon" aria-hidden>
                      <i className={getCourseCategoryIconClass(g.course_category_name)} />
                    </span>
                    <span className="exam-tile__index">{String(index + 1).padStart(2, '0')}</span>
                  </span>
                  <h3 className="exam-tile__name">{g.course_category_name || 'Programmes'}</h3>
                  <p className="exam-tile__meta">
                    {total > 0 ? `${total} programme${total === 1 ? '' : 's'}` : 'Explore category'}
                  </p>
                  <span className="exam-tile__go">
                    Open <i className="ri-arrow-right-up-line" aria-hidden />
                  </span>
                </>
              )
              return (
                <li key={g.course_category_id ?? g.course_category_name}>
                  {g.course_category_id != null ? (
                    <Link href={`/courses/${g.course_category_id}`} className="exam-tile">
                      {inner}
                    </Link>
                  ) : (
                    <div className="exam-tile exam-tile--static">{inner}</div>
                  )}
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="exam-dir__empty" role="status">
            <i className="ri-search-line" aria-hidden />
            <h3>No programmes match your search.</h3>
            <p>Try another exam name or clear the availability filter.</p>
            <button
              type="button"
              className="pub-btn-ghost"
              onClick={() => {
                setSearch('')
                setAvailableOnly(false)
              }}
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {showViewAllLink ? (
        <Link href="/#department" className="pub-btn-ghost">
          Explore all programmes <i className="ri-arrow-right-up-line" aria-hidden />
        </Link>
      ) : null}
    </div>
  )
}
