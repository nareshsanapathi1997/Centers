import type { LucideIcon } from 'lucide-react'
import { BookOpen, GitBranch, GraduationCap, Layers } from 'lucide-react'
import {
  COURSE_MASTER_LEVEL_ORDER,
  LEVEL_LABELS,
  LEVEL_SLUGS,
  type CourseMasterLevel,
} from '@/lib/course-masters'

export type CourseMastersNavItem = {
  href: string
  label: string
  icon: LucideIcon
  level: CourseMasterLevel
}

const LEVEL_ICONS: Record<CourseMasterLevel, LucideIcon> = {
  main_course: BookOpen,
  sub_variant: GitBranch,
  course: GraduationCap,
  sub_sub_variant: Layers,
  leaf_course: GraduationCap,
}

export const COURSE_MASTERS_NAV: CourseMastersNavItem[] = COURSE_MASTER_LEVEL_ORDER.map((level) => ({
  href: `/super-admin/course-masters/${LEVEL_SLUGS[level]}`,
  label: LEVEL_LABELS[level],
  icon: LEVEL_ICONS[level],
  level,
}))

export function isCourseMastersPath(pathname: string | null): boolean {
  return Boolean(pathname === '/super-admin/course-masters' || pathname?.startsWith('/super-admin/course-masters/'))
}

export function isCourseMastersNavItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  const pathOnly = pathname.split('?')[0]
  const hrefPath = href.split('?')[0]
  if (pathOnly === hrefPath) return true
  if (hrefPath.endsWith('/courses') && pathOnly.endsWith('/final-courses')) return true
  return false
}

export function getCourseMastersPageTitle(pathname: string | null): string {
  if (!pathname) return 'Course Masters'
  const pathOnly = pathname.split('?')[0]
  if (pathOnly.endsWith('/final-courses')) return LEVEL_LABELS.course
  const item = COURSE_MASTERS_NAV.find(
    (nav) => pathOnly === nav.href || pathOnly.startsWith(`${nav.href}/`)
  )
  return item?.label ?? 'Course Masters'
}
