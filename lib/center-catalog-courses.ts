import { unstable_cache } from 'next/cache'
import pool from '@/lib/db'
import { resolveCategoryIdForAssignedName } from '@/lib/category-name-utils'
import { fetchAllCategoryRefs } from '@/lib/course-category-master'
import {
  countLeafCoursesByMainCourseIds,
  getLeafCountsByMainCourseId,
  getCatalogCategoryPageData,
} from '@/lib/course-master-catalog'
import type { CourseMasterCategoryFilters } from '@/lib/course-master-category-filters'

/** Category group for center home + category pages (course master catalog). */
export type CenterCategoryGroup = {
  course_category_id: number | null
  course_category_name: string | null
  courses: Record<string, unknown>[]
  courseCount?: number
}

export type CenterCatalogCoursesPayload = {
  collegeTab: CenterCategoryGroup[]
  school: CenterCategoryGroup[]
}

export type CenterCategoryPagePayload = {
  group: CenterCategoryGroup
  filters: CourseMasterCategoryFilters
}

const CACHE_REVALIDATE = 120

type AssignedCenterCourse = {
  name: string
  category: string
}

type ResolvedAssignment = {
  assignedName: string
  categoryId: number | null
  displayName: string
  level: 'college' | 'school'
}

async function queryActiveCenterCourses(centerId: number): Promise<AssignedCenterCourse[]> {
  const result = await pool.query<AssignedCenterCourse>(
    `SELECT name, category
     FROM courses
     WHERE center_id = $1 AND is_active = true
     ORDER BY display_order, name`,
    [centerId]
  )
  return result.rows
}

async function resolveAssignedCategories(centerId: number): Promise<ResolvedAssignment[]> {
  const assigned = await queryActiveCenterCourses(centerId)
  if (assigned.length === 0) return []

  const [allCategories, leafCounts] = await Promise.all([
    fetchAllCategoryRefs(),
    getLeafCountsByMainCourseId(),
  ])
  const out: ResolvedAssignment[] = []
  const seenCategoryIds = new Set<number>()
  const seenUnmapped = new Set<string>()

  for (const row of assigned) {
    const assignedName = row.name.trim()
    if (!assignedName) continue

    const categoryId = resolveCategoryIdForAssignedName(assignedName, allCategories, leafCounts)

    if (categoryId != null) {
      if (seenCategoryIds.has(categoryId)) continue
      seenCategoryIds.add(categoryId)
      const masterName = allCategories.find((c) => c.id === categoryId)?.course_name
      out.push({
        assignedName,
        categoryId,
        displayName: masterName ?? assignedName,
        level: row.category === 'school_level' ? 'school' : 'college',
      })
      continue
    }

    const unmappedKey = assignedName.toLowerCase()
    if (seenUnmapped.has(unmappedKey)) continue
    seenUnmapped.add(unmappedKey)
    out.push({
      assignedName,
      categoryId: null,
      displayName: assignedName,
      level: row.category === 'school_level' ? 'school' : 'college',
    })
  }

  return out
}

async function buildCenterCatalogCourses(
  centerId: number,
  options?: { includeCourseRows?: boolean }
): Promise<CenterCatalogCoursesPayload | null> {
  const assignments = await resolveAssignedCategories(centerId)
  if (assignments.length === 0) return null

  const mappedIds = assignments
    .map((a) => a.categoryId)
    .filter((id): id is number => id != null)

  const includeRows = options?.includeCourseRows === true
  const counts =
    mappedIds.length > 0 && !includeRows
      ? await countLeafCoursesByMainCourseIds(mappedIds)
      : new Map<number, number>()

  const collegeTab: CenterCategoryGroup[] = []
  const school: CenterCategoryGroup[] = []

  for (const assignment of assignments) {
    const { categoryId, displayName, level } = assignment
    let courses: Record<string, unknown>[] = []
    let courseCount = 0

    if (categoryId != null) {
      courses = includeRows
        ? (await getCatalogCategoryPageData(categoryId)).courses
        : []
      courseCount = includeRows ? courses.length : (counts.get(categoryId) ?? 0)
    }

    const group: CenterCategoryGroup = {
      course_category_id: categoryId,
      course_category_name: displayName,
      courses,
      courseCount,
    }

    if (level === 'school') school.push(group)
    else collegeTab.push(group)
  }

  if (collegeTab.length === 0 && school.length === 0) return null
  return { collegeTab, school }
}

async function buildCenterCategoryGroup(
  centerId: number,
  categoryId: string
): Promise<CenterCategoryPagePayload | null> {
  const wantNum = Number.parseInt(categoryId, 10)
  if (!Number.isFinite(wantNum) || wantNum <= 0) return null

  const assignments = await resolveAssignedCategories(centerId)
  const assignment = assignments.find((a) => a.categoryId === wantNum)
  if (!assignment) return null

  const { courses, filters } = await getCatalogCategoryPageData(wantNum)

  return {
    group: {
      course_category_id: wantNum,
      course_category_name: assignment.displayName,
      courses,
      courseCount: courses.length,
    },
    filters,
  }
}

async function queryCenterIdBySlug(slug: string): Promise<number | null> {
  const result = await pool.query<{ id: number }>(
    'SELECT id FROM centers WHERE slug = $1 LIMIT 1',
    [slug.trim()]
  )
  const id = result.rows[0]?.id
  return typeof id === 'number' && Number.isFinite(id) ? id : null
}

export async function getCenterCatalogCoursesForCenterId(
  centerId: number
): Promise<CenterCatalogCoursesPayload | null> {
  return unstable_cache(
    async () => buildCenterCatalogCourses(centerId, { includeCourseRows: false }),
    ['center-catalog-courses-v5', String(centerId)],
    { revalidate: CACHE_REVALIDATE, tags: [`center-catalog-${centerId}`] }
  )()
}

export async function getCenterCatalogCoursesForCenterSlug(
  slug: string
): Promise<CenterCatalogCoursesPayload | null> {
  const centerId = await queryCenterIdBySlug(slug)
  if (centerId == null) return null
  return getCenterCatalogCoursesForCenterId(centerId)
}

export async function getCenterCategoryGroupForCenter(
  centerId: number,
  categoryId: string
): Promise<CenterCategoryPagePayload | null> {
  return unstable_cache(
    async () => buildCenterCategoryGroup(centerId, categoryId),
    ['center-category-group-v5', String(centerId), categoryId],
    {
      revalidate: CACHE_REVALIDATE,
      tags: [`center-catalog-${centerId}`, `center-category-${centerId}-${categoryId}`],
    }
  )()
}

export async function centerHasAssignedCatalogCategories(centerId: number): Promise<boolean> {
  const assigned = await queryActiveCenterCourses(centerId)
  return assigned.length > 0
}
