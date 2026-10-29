'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { pathnameToBrowserUrl } from '@/lib/with-base-path'
import {
  courseMatchesSubTypeFilter,
  courseMatchesTypeFilter,
  parsePositiveInt,
} from '@/lib/teems-course-display'
import { buildTeemsCompareCourses } from '@/lib/teems-compare-courses'
import TeemsProgramGrid from '@/components/teems/TeemsProgramGrid'
import CategoryCoursesPagination from '@/components/teems/CategoryCoursesPagination'
import TypeFilterForm from '@/components/teems/TypeFilterForm'

export type CourseTypeRow = { id: number; name: string }
export type CourseSubTypeRow = { id: number; name: string }

const COURSES_PER_PAGE = 12

export default function CategoryCoursesFilteredView({
  centerSlug,
  brandLinks = false,
  categoryId,
  sectionTitle,
  courses,
  typeRows,
  subTypesByTypeId,
  typeNameByIdEntries,
  categoryNumericId,
  initialType = '',
  initialSubType = '',
  initialPage = 1,
}: {
  centerSlug: string
  /** Main company site: course links go to the brand page, not the branding centre. */
  brandLinks?: boolean
  categoryId: string
  sectionTitle: string
  courses: Record<string, unknown>[]
  typeRows: CourseTypeRow[]
  subTypesByTypeId: Record<string, CourseSubTypeRow[]>
  typeNameByIdEntries: [number, string][]
  categoryNumericId: number | null
  initialType?: string
  initialSubType?: string
  initialPage?: number
}) {
  const pathname = usePathname()
  const typeNameById = useMemo(() => new Map(typeNameByIdEntries), [typeNameByIdEntries])

  const [selectedType, setSelectedType] = useState(initialType)
  const [selectedSubType, setSelectedSubType] = useState(initialSubType)
  const [currentPage, setCurrentPage] = useState(initialPage)

  const selectedTypeId = parsePositiveInt(selectedType)
  const selectedSubTypeId = parsePositiveInt(selectedSubType)
  const subTypeRows =
    selectedTypeId != null ? subTypesByTypeId[String(selectedTypeId)] ?? [] : []

  const validSubTypeFilter =
    selectedSubTypeId != null &&
    selectedTypeId != null &&
    subTypeRows.some((row) => row.id === selectedSubTypeId)

  const filteredCourses = useMemo(() => {
    let rows = courses
    if (selectedTypeId != null) {
      rows = rows.filter((course) =>
        courseMatchesTypeFilter(course, selectedTypeId, typeNameById)
      )
    }
    if (validSubTypeFilter && selectedSubTypeId != null) {
      rows = rows.filter((course) => courseMatchesSubTypeFilter(course, selectedSubTypeId))
    }
    return rows
  }, [courses, selectedTypeId, selectedSubTypeId, validSubTypeFilter, typeNameById])

  const totalCourses = filteredCourses.length
  const totalPages = Math.max(1, Math.ceil(totalCourses / COURSES_PER_PAGE))
  const safePage = Math.min(Math.max(currentPage, 1), totalPages)
  const start = (safePage - 1) * COURSES_PER_PAGE
  const pageCourses = filteredCourses.slice(start, start + COURSES_PER_PAGE)

  const compareCourses = useMemo(
    () => buildTeemsCompareCourses(filteredCourses, typeNameById, categoryNumericId),
    [filteredCourses, typeNameById, categoryNumericId]
  )

  const selectedTypeName =
    selectedTypeId != null
      ? typeRows.find((row) => row.id === selectedTypeId)?.name ?? ''
      : ''

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams()
    if (selectedType) params.set('type', selectedType)
    if (validSubTypeFilter && selectedSubType) params.set('subtype', selectedSubType)
    if (safePage > 1) params.set('page', String(safePage))
    const query = params.toString()
    const nextUrl = pathnameToBrowserUrl(pathname, query || undefined)
    window.history.replaceState(window.history.state, '', nextUrl)
  }, [pathname, selectedType, selectedSubType, validSubTypeFilter, safePage])

  const onTypeChange = (value: string) => {
    setSelectedType(value)
    setSelectedSubType('')
    setCurrentPage(1)
  }

  const onSubTypeChange = (value: string) => {
    setSelectedSubType(value)
    setCurrentPage(1)
  }

  const onClearFilters = () => {
    setSelectedType('')
    setSelectedSubType('')
    setCurrentPage(1)
  }

  const resultSummary =
    totalCourses > 0
      ? `Showing ${start + 1}–${Math.min(start + pageCourses.length, totalCourses)} of ${totalCourses} course${totalCourses === 1 ? '' : 's'}${
          totalPages > 1 ? ` (page ${safePage} of ${totalPages})` : ''
        }`
      : undefined

  return (
    <>
      {typeRows.length > 0 ? (
        <TypeFilterForm
          typeRows={typeRows}
          subTypeRows={subTypeRows}
          selectedType={selectedType}
          selectedSubType={validSubTypeFilter ? selectedSubType : ''}
          sectionTitle={sectionTitle}
          resultSummary={resultSummary}
          compareCourses={compareCourses}
          compareSelectedTypeName={selectedTypeName}
          showCompareButton={selectedTypeId != null && compareCourses.length >= 2}
          centerSlug={centerSlug}
          compareCenterSlug={brandLinks ? '' : centerSlug}
          onTypeChange={onTypeChange}
          onSubTypeChange={onSubTypeChange}
          onClearFilters={onClearFilters}
        />
      ) : (
        <>
          <h2 className="content-title style1 mb-2 teems-type-filter-section-title">
            <span>{sectionTitle}</span>
          </h2>
          {resultSummary ? (
            <p className="text-muted small mb-4 teems-type-filter-result-summary">{resultSummary}</p>
          ) : null}
        </>
      )}
      <TeemsProgramGrid
        courses={pageCourses}
        centerSlug={brandLinks ? '' : centerSlug}
        typeNameById={typeNameById}
        selectedType={selectedType}
        selectedSubType={validSubTypeFilter ? selectedSubType : ''}
      />
      <CategoryCoursesPagination
        slug={centerSlug}
        categoryId={categoryId}
        currentPage={safePage}
        totalPages={totalPages}
        selectedType={selectedType}
        selectedSubType={validSubTypeFilter ? selectedSubType : ''}
        onPageChange={setCurrentPage}
      />
    </>
  )
}
