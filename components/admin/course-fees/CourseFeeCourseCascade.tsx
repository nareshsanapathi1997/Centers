'use client'

import { useMemo } from 'react'

export type CourseFeeFilterOption = { value: string; label: string }

export type CourseFeeCascadeCourse = {
  course_master_id: number
  course_title?: string
  main_course_id?: number
  sub_variant_id?: number | null
  sub_variant_title?: string | null
  category_path?: string
}

type CourseFeeCourseCascadeProps = {
  mainCourses: Array<{ id: number; title: string }>
  catalog: CourseFeeCascadeCourse[]
  mainCourseId: string
  subProgramId: string
  courseId: string
  onMainCourseChange: (value: string) => void
  onSubProgramChange: (value: string) => void
  onCourseChange: (value: string) => void
  mainEmptyLabel?: string
  className?: string
}

export function buildSubProgramOptions(catalog: CourseFeeCascadeCourse[], mainCourseId: string) {
  if (!mainCourseId) return [] as Array<{ id: number; title: string }>
  const rows = catalog.filter((c) => c.main_course_id != null && String(c.main_course_id) === mainCourseId)
  const map = new Map<number, string>()
  for (const c of rows) {
    if (c.sub_variant_id != null) {
      map.set(c.sub_variant_id, c.sub_variant_title || `Sub #${c.sub_variant_id}`)
    }
  }
  return Array.from(map.entries())
    .map(([id, title]) => ({ id, title }))
    .sort((a, b) => a.title.localeCompare(b.title))
}

export function buildCourseOptions(
  catalog: CourseFeeCascadeCourse[],
  mainCourseId: string,
  subProgramId: string,
  subProgramCount: number
) {
  if (!mainCourseId) return [] as CourseFeeCascadeCourse[]
  let rows = catalog.filter((c) => c.main_course_id != null && String(c.main_course_id) === mainCourseId)
  if (subProgramCount > 0) {
    if (!subProgramId) return []
    rows = rows.filter((c) => String(c.sub_variant_id) === subProgramId)
  }
  return rows.sort((a, b) => (a.category_path || a.course_title || '').localeCompare(b.category_path || b.course_title || ''))
}

export function canSelectCourseInCascade(
  mainCourseId: string,
  subProgramId: string,
  subProgramCount: number,
  courseCount: number
) {
  return Boolean(mainCourseId) && (Boolean(subProgramId) || (subProgramCount === 0 && courseCount > 0))
}

export default function CourseFeeCourseCascade({
  mainCourses,
  catalog,
  mainCourseId,
  subProgramId,
  courseId,
  onMainCourseChange,
  onSubProgramChange,
  onCourseChange,
  mainEmptyLabel = 'Choose main course...',
  className = '',
}: CourseFeeCourseCascadeProps) {
  const subProgramOptions = useMemo(
    () => buildSubProgramOptions(catalog, mainCourseId),
    [catalog, mainCourseId]
  )

  const courseOptions = useMemo(
    () => buildCourseOptions(catalog, mainCourseId, subProgramId, subProgramOptions.length),
    [catalog, mainCourseId, subProgramId, subProgramOptions.length]
  )

  const canSelectCourse = canSelectCourseInCascade(
    mainCourseId,
    subProgramId,
    subProgramOptions.length,
    courseOptions.length
  )

  const subProgramPlaceholder = !mainCourseId
    ? 'Select main course first'
    : subProgramOptions.length === 0
      ? 'No sub-programs for this main'
      : 'Choose sub program...'

  const coursePlaceholder = !mainCourseId
    ? 'Select main course first'
    : subProgramOptions.length > 0 && !subProgramId
      ? 'Select sub program first'
      : courseOptions.length === 0
        ? 'No courses available'
        : 'Choose course...'

  return (
    <div className={`admin-form-row admin-form-row--3 ${className}`.trim()}>
      <div className="admin-form-col-6">
        <label className="admin-form-label">Main course</label>
        <select
          value={mainCourseId}
          onChange={(e) => onMainCourseChange(e.target.value)}
          className="admin-form-control"
        >
          <option value="">{mainEmptyLabel}</option>
          {mainCourses.map((m) => (
            <option key={m.id} value={String(m.id)}>
              {m.title}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-form-col-6">
        <label className="admin-form-label">Sub program</label>
        <select
          value={subProgramId}
          onChange={(e) => onSubProgramChange(e.target.value)}
          disabled={!mainCourseId || subProgramOptions.length === 0}
          className="admin-form-control"
        >
          <option value="">{subProgramPlaceholder}</option>
          {subProgramOptions.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      <div className="admin-form-col-6">
        <label className="admin-form-label">Select course</label>
        <select
          value={courseId}
          onChange={(e) => onCourseChange(e.target.value)}
          disabled={!canSelectCourse}
          className="admin-form-control"
        >
          <option value="">{coursePlaceholder}</option>
          {courseOptions.map((c) => (
            <option key={c.course_master_id} value={String(c.course_master_id)}>
              {c.category_path || c.course_title || `Course #${c.course_master_id}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
