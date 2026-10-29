import { getCourses } from '@/lib/api'
import { getCenterCatalogCoursesForCenterId } from '@/lib/center-catalog-courses'
import type { CenterCategoryGroup } from '@/lib/center-catalog-courses'
import { getCategoryMapsForCourseNames } from '@/lib/category-paths'
import { getCategoryIdForCourseName } from '@/lib/category-name-utils'
import type { Course } from '@/types'

export type CenterEnquiryCourseOption = {
  name: string
  categoryMasterId: number
  category?: string
}

function catalogCategoryDisplayNames(groups: CenterCategoryGroup[]): string[] {
  return groups
    .map((g) => (g.course_category_name != null ? String(g.course_category_name).trim() : ''))
    .filter((n) => n.length > 0)
}

export function buildEnquiryCourseOptionsFromOurCourses(input: {
  collegeCourses?: Course[]
  schoolCourses?: Course[]
  catalogCollegeTab?: CenterCategoryGroup[]
  catalogSchool?: CenterCategoryGroup[]
  categoryIdByCourseName?: Record<string, number>
}): CenterEnquiryCourseOption[] {
  const {
    collegeCourses = [],
    schoolCourses = [],
    catalogCollegeTab = [],
    catalogSchool = [],
    categoryIdByCourseName = {},
  } = input

  const useCatalog = catalogCollegeTab.length > 0 || catalogSchool.length > 0
  if (useCatalog) {
    const seen = new Set<number>()
    const options: CenterEnquiryCourseOption[] = []

    for (const group of [...catalogCollegeTab, ...catalogSchool]) {
      const name = group.course_category_name?.trim()
      if (!name) continue

      let categoryMasterId: number | undefined
      if (group.course_category_id != null && Number.isFinite(group.course_category_id)) {
        categoryMasterId = group.course_category_id
      } else {
        categoryMasterId = getCategoryIdForCourseName(categoryIdByCourseName, name)
      }

      if (!categoryMasterId || seen.has(categoryMasterId)) continue
      seen.add(categoryMasterId)
      options.push({ name, categoryMasterId })
    }

    return options.sort((a, b) => a.name.localeCompare(b.name))
  }

  return buildCenterEnquiryCourseOptions(collegeCourses, schoolCourses, categoryIdByCourseName)
}

export function buildCenterEnquiryCourseOptions(
  collegeCourses: Course[],
  schoolCourses: Course[],
  categoryIdByCourseName: Record<string, number>,
): CenterEnquiryCourseOption[] {
  const seen = new Set<number>()
  const options: CenterEnquiryCourseOption[] = []

  for (const course of [...collegeCourses, ...schoolCourses]) {
    const categoryMasterId = getCategoryIdForCourseName(categoryIdByCourseName, course.name)
    if (!categoryMasterId || seen.has(categoryMasterId)) continue
    seen.add(categoryMasterId)
    options.push({
      name: course.name,
      categoryMasterId,
      category: course.category,
    })
  }

  return options.sort((a, b) => a.name.localeCompare(b.name))
}

export async function loadEnquiryCourseOptionsForCenter(
  centerId: number,
  _centerSlug: string,
): Promise<CenterEnquiryCourseOption[]> {
  const [collegeCourses, schoolCourses, catalogCourses] = await Promise.all([
    getCourses(centerId, 'college_level'),
    getCourses(centerId, 'school_level'),
    getCenterCatalogCoursesForCenterId(centerId),
  ])

  const useCatalog =
    catalogCourses != null &&
    (catalogCourses.collegeTab.length > 0 || catalogCourses.school.length > 0)

  const names = [
    ...collegeCourses.map((c) => c.name),
    ...schoolCourses.map((c) => c.name),
    ...(useCatalog && catalogCourses
      ? [
        ...catalogCategoryDisplayNames(catalogCourses.collegeTab),
        ...catalogCategoryDisplayNames(catalogCourses.school),
      ]
      : []),
  ]

  const { idByCourseName } =
    names.length > 0
      ? await getCategoryMapsForCourseNames(names)
      : { idByCourseName: {} as Record<string, number> }

  return buildEnquiryCourseOptionsFromOurCourses({
    collegeCourses,
    schoolCourses,
    catalogCollegeTab: catalogCourses?.collegeTab,
    catalogSchool: catalogCourses?.school,
    categoryIdByCourseName: idByCourseName,
  })
}
