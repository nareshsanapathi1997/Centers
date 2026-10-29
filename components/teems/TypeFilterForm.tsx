'use client'

import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { CourseSubTypeRow, CourseTypeRow } from '@/components/teems/CategoryCoursesFilteredView'
import type { TeemsCompareCourse } from '@/lib/teems-compare-courses'
import CategoryCoursesCompare from '@/components/teems/CategoryCoursesCompare'
import './TypeFilterForm.css'

export default function TypeFilterForm({
  typeRows,
  subTypeRows = [],
  selectedType,
  selectedSubType = '',
  sectionTitle = 'Coaching Programs',
  resultSummary,
  compareCourses = [],
  compareSelectedTypeName = '',
  showCompareButton = false,
  centerSlug = '',
  compareCenterSlug,
  onTypeChange,
  onSubTypeChange,
  onClearFilters,
}: {
  typeRows: CourseTypeRow[]
  subTypeRows?: CourseSubTypeRow[]
  selectedType: string
  selectedSubType?: string
  sectionTitle?: string
  resultSummary?: string
  compareCourses?: TeemsCompareCourse[]
  compareSelectedTypeName?: string
  showCompareButton?: boolean
  centerSlug?: string
  /** Centre slug for compare Enroll links; '' on the main site. Defaults to centerSlug. */
  compareCenterSlug?: string
  /** When set, filter changes stay on the client (no full page navigation). */
  onTypeChange?: (value: string) => void
  onSubTypeChange?: (value: string) => void
  onClearFilters?: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const clientFilterMode = Boolean(onTypeChange && onSubTypeChange && onClearFilters)

  const pushWithParams = (updates: { type?: string; subtype?: string }) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.delete('page')

    if (updates.type !== undefined) {
      if (updates.type) {
        params.set('type', updates.type)
      } else {
        params.delete('type')
      }
    }

    if (updates.subtype !== undefined) {
      if (updates.subtype) {
        params.set('subtype', updates.subtype)
      } else {
        params.delete('subtype')
      }
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const handleTypeChange = (value: string) => {
    if (clientFilterMode) {
      onTypeChange!(value)
      return
    }
    pushWithParams({ type: value, subtype: '' })
  }

  const handleSubTypeChange = (value: string) => {
    if (clientFilterMode) {
      onSubTypeChange!(value)
      return
    }
    pushWithParams({ subtype: value })
  }

  const handleClearAllFilters = () => {
    if (clientFilterMode) {
      onClearFilters!()
      return
    }
    pushWithParams({ type: '', subtype: '' })
  }

  const showSubTypeFilter = Boolean(selectedType && subTypeRows.length > 0)
  const hasActiveFilters = Boolean(selectedType || selectedSubType)

  const selectedTypeName =
    typeRows.find((row) => String(row.id) === selectedType)?.name ?? ''
  const selectedSubTypeName =
    subTypeRows.find((row) => String(row.id) === selectedSubType)?.name ?? ''

  return (
    <div className="teems-type-filter-wrap">
      <div className="teems-type-filter-head">
        <h2 className="teems-type-filter-section-title">
          <span>{sectionTitle}</span>
        </h2>
        {resultSummary ? (
          <p className="teems-type-filter-result-summary">{resultSummary}</p>
        ) : null}
      </div>

      <div className="teems-type-filter-panel">
        <div className={`teems-type-filter-row${showSubTypeFilter ? ' has-subtype' : ''}`}>
          <div className="teems-type-filter-field">
            <label htmlFor="course-type-filter" className="teems-type-filter-field-label">
              Course type
            </label>
            <select
              id="course-type-filter"
              name="type"
              className="form-select teems-type-filter-select"
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              <option value="">All types</option>
              {typeRows.map((row) => (
                <option key={row.id} value={String(row.id)}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>

          {showSubTypeFilter ? (
            <div className="teems-type-filter-field">
              <label htmlFor="course-subtype-filter" className="teems-type-filter-field-label">
                Sub course type
              </label>
              <select
                id="course-subtype-filter"
                name="subtype"
                className="form-select teems-type-filter-select"
                value={selectedSubType}
                onChange={(e) => handleSubTypeChange(e.target.value)}
              >
                <option value="">All sub types</option>
                {subTypeRows.map((row) => (
                  <option key={row.id} value={String(row.id)}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {showCompareButton ? (
            <div className="teems-type-filter-compare-slot">
              <CategoryCoursesCompare
                inline
                courses={compareCourses}
                selectedTypeName={compareSelectedTypeName}
                showCompareButton={showCompareButton}
                centerSlug={compareCenterSlug ?? centerSlug}
              />
            </div>
          ) : null}

          {centerSlug ? (
            <div className="teems-type-filter-back-slot">
              <Link href={pathname.startsWith('/courses') ? '/#department' : `/${centerSlug}#department`} className="teems-type-filter-back-btn">
                <i className="ri-arrow-left-line" aria-hidden />
                Back to Courses
              </Link>
            </div>
          ) : null}
        </div>

        {hasActiveFilters ? (
          <div className="teems-type-filter-active-row" aria-label="Active filters">
            <div className="teems-type-filter-tags">
              {selectedTypeName ? (
                <button
                  type="button"
                  className="teems-type-filter-tag"
                  onClick={() => handleTypeChange('')}
                  title="Remove course type filter"
                >
                  {selectedTypeName}
                  <i className="ri-close-line" aria-hidden />
                </button>
              ) : null}
              {selectedSubTypeName ? (
                <button
                  type="button"
                  className="teems-type-filter-tag"
                  onClick={() => handleSubTypeChange('')}
                  title="Remove sub course type filter"
                >
                  {selectedSubTypeName}
                  <i className="ri-close-line" aria-hidden />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              className="teems-type-filter-clear-btn"
              onClick={handleClearAllFilters}
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
