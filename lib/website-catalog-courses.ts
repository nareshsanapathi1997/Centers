import { unstable_cache } from 'next/cache'
import pool from '@/lib/db'
import type { CenterCategoryGroup, CenterCategoryPagePayload } from '@/lib/center-catalog-courses'
import { listMainCourseCategories } from '@/lib/course-category-master'
import {
  getLeafCountsByMainCourseId,
  getCatalogCategoryPageData,
} from '@/lib/course-master-catalog'

const CACHE_TAG = 'course-masters'

export type WebsiteCatalogCoursesPayload = {
  collegeTab: CenterCategoryGroup[]
  school: CenterCategoryGroup[]
}

type MainCourseRow = {
  id: number
  title: string
  slug: string
  short_description: string | null
  image_url: string | null
  display_order: number
}

async function queryActiveMainCourses(): Promise<MainCourseRow[]> {
  const result = await pool.query<MainCourseRow>(
    `SELECT id, title, slug, short_description, image_url, display_order
     FROM course_masters
     WHERE level_type = 'main_course' AND is_active = true
     ORDER BY display_order, title`
  )
  return result.rows
}

async function buildWebsiteCatalogCourses(
  includeCourseRows = false
): Promise<WebsiteCatalogCoursesPayload> {
  const [mainCourses, leafCounts, categoryTypes] = await Promise.all([
    queryActiveMainCourses(),
    getLeafCountsByMainCourseId(),
    listMainCourseCategories(),
  ])

  const typeById = new Map(categoryTypes.map((row) => [row.id, row.type]))

  const collegeTab: CenterCategoryGroup[] = []
  const school: CenterCategoryGroup[] = []

  for (const row of mainCourses) {
    const courseCount = leafCounts[row.id] ?? 0
    let courses: Record<string, unknown>[] = []
    if (includeCourseRows && courseCount > 0) {
      courses = (await getCatalogCategoryPageData(row.id)).courses as Record<string, unknown>[]
    }

    const group: CenterCategoryGroup = {
      course_category_id: row.id,
      course_category_name: row.title,
      courseCount,
      courses,
    }

    // type 2 = school level (same rules as center home / course-category-master)
    if (typeById.get(row.id) === 2) {
      school.push(group)
    } else {
      collegeTab.push(group)
    }
  }

  return { collegeTab, school }
}

export const getWebsiteCatalogCourses = unstable_cache(
  () => buildWebsiteCatalogCourses(false),
  ['website-catalog-courses-v3'],
  { revalidate: 120, tags: [CACHE_TAG, 'website-home'] }
)

export async function getWebsiteCategoryGroup(
  categoryId: string | number
): Promise<CenterCategoryPagePayload | null> {
  const id = Number(categoryId)
  if (!Number.isFinite(id) || id <= 0) return null

  const result = await pool.query<MainCourseRow>(
    `SELECT id, title, slug, short_description, image_url, display_order
     FROM course_masters
     WHERE id = $1 AND level_type = 'main_course' AND is_active = true
     LIMIT 1`,
    [id]
  )
  const main = result.rows[0]
  if (!main) return null

  const { courses, filters } = await getCatalogCategoryPageData(main.id)

  return {
    group: {
      course_category_id: main.id,
      course_category_name: main.title,
      courseCount: courses.length,
      courses,
    },
    filters,
  }
}
