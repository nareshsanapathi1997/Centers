'use client'

import Link from 'next/link'
import { getProgramListingHref } from '@/lib/category-listing-link'
import { getCategoryIdForCourseName } from '@/lib/category-name-utils'
import type { Course } from '@/types'
import './CourseCategoryCardActions.css'

interface CourseCategoryCardActionsProps {
  centerSlug: string
  course: Course
  categoryIdByCourseName?: Record<string, number>
  onTrackedClick?: (courseId: number) => void
}

export default function CourseCategoryCardActions({
  centerSlug,
  course,
  categoryIdByCourseName,
  onTrackedClick,
}: CourseCategoryCardActionsProps) {
  const courseCategoryId = getCategoryIdForCourseName(categoryIdByCourseName, course.name)
  const { href: viewHref } = getProgramListingHref({
    centerSlug,
    courseName: course.name,
    categoryIdByCourseName,
    courseCategoryId,
  })
  const enrollHref = `/${centerSlug}/contact`

  const track = () => {
    if (onTrackedClick) void onTrackedClick(course.id)
  }

  return (
    <div className="course-card-actions">
      <Link href={enrollHref} className="course-card-btn course-card-btn-enroll" onClick={track}>
        <i className="ri-check-line" aria-hidden />
        Enroll Now
      </Link>
      <Link href={viewHref} className="course-card-btn course-card-btn-view" onClick={track}>
        View Details
        <i className="ri-arrow-right-line" aria-hidden />
      </Link>
    </div>
  )
}
