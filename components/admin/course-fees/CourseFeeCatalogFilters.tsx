'use client'

import AdminButton from '@/components/admin/AdminButton'
import CourseFeeCourseCascade, { type CourseFeeCascadeCourse, type CourseFeeFilterOption } from '@/components/admin/course-fees/CourseFeeCourseCascade'

export type { CourseFeeFilterOption }

type StatusPill = {
  key: string
  label: string
  active: boolean
  onClick: () => void
}

type CourseFeeCatalogFiltersProps = {
  mainCourses: Array<{ id: number; title: string }>
  catalog: CourseFeeCascadeCourse[]
  mainCourseId: string
  subProgramId: string
  courseId: string
  onMainCourseChange: (value: string) => void
  onSubProgramChange: (value: string) => void
  onCourseChange: (value: string) => void
  mainEmptyLabel?: string
  search: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  statusPills: StatusPill[]
}

export default function CourseFeeCatalogFilters({
  mainCourses,
  catalog,
  mainCourseId,
  subProgramId,
  courseId,
  onMainCourseChange,
  onSubProgramChange,
  onCourseChange,
  mainEmptyLabel,
  search,
  statusPills,
}: CourseFeeCatalogFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
        <CourseFeeCourseCascade
          mainCourses={mainCourses}
          catalog={catalog}
          mainCourseId={mainCourseId}
          subProgramId={subProgramId}
          courseId={courseId}
          onMainCourseChange={onMainCourseChange}
          onSubProgramChange={onSubProgramChange}
          onCourseChange={onCourseChange}
          mainEmptyLabel={mainEmptyLabel}
        />
      </div>

      <div className="admin-filter-bar">
        <input
          type="search"
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          placeholder={search.placeholder || 'Search course path...'}
          className="admin-search-control flex-1"
        />
        <div className="admin-filter-bar__controls">
          {statusPills.map((pill) => (
            <AdminButton
              key={pill.key}
              type="button"
              variant="secondary"
              size="sm"
              active={pill.active}
              onClick={pill.onClick}
            >
              {pill.label}
            </AdminButton>
          ))}
        </div>
      </div>
    </div>
  )
}
