'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { getProgramListingHref } from '@/lib/category-listing-link'
import { getCategoryIdForCourseName } from '@/lib/category-name-utils'
import type { Course } from '@/types'

export default function CourseCategoryProgramLink({
  centerSlug,
  course,
  categoryIdByCourseName,
  onTrackedClick,
  className,
  children,
}: {
  centerSlug: string
  course: Course
  categoryIdByCourseName?: Record<string, number>
  onTrackedClick?: (courseId: number) => void
  className?: string
  children: ReactNode
}) {
  const linkUrl = (course as Course & { link_url?: string }).link_url?.trim()
  const cls = className ?? 'course-card-link'
  const track = () => {
    if (onTrackedClick) void onTrackedClick(course.id)
  }

  if (linkUrl) {
    const isExternal = linkUrl.startsWith('http://') || linkUrl.startsWith('https://')
    if (isExternal) {
      return (
        <a href={linkUrl} className={cls} onClick={track} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      )
    }
    const href = linkUrl.startsWith('/') ? linkUrl : `/${linkUrl}`
    return (
      <Link href={href} className={cls} onClick={track}>
        {children}
      </Link>
    )
  }

  if (!centerSlug) {
    return (
      <Link href="/courses" className={cls} onClick={track}>
        {children}
      </Link>
    )
  }

  const courseCategoryId = getCategoryIdForCourseName(categoryIdByCourseName, course.name)
  const { href } = getProgramListingHref({
    centerSlug,
    courseName: course.name,
    categoryIdByCourseName,
    courseCategoryId,
  })

  return (
    <Link href={href} className={cls} onClick={track}>
      {children}
    </Link>
  )
}
