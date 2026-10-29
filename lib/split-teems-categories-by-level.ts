import { fetchCategoryNamesByIds } from '@/lib/course-category-master'

/** Split TEEMS category groups by college vs school using course master metadata. */
export async function splitTeemsCategoriesByLevel<T extends { course_category_id: number | null }>(
  groups: T[]
): Promise<{ college: T[]; school: T[]; other: T[] }> {
  const ids = groups
    .map((g) => g.course_category_id)
    .filter((id): id is number => id != null && Number.isFinite(id))

  const college: T[] = []
  const school: T[] = []

  if (ids.length === 0) {
    return { college: groups, school: [], other: [] }
  }

  const { listMainCourseCategories } = await import('@/lib/course-category-master')
  const masters = await listMainCourseCategories()
  const typeById = new Map(masters.map((m) => [m.id, m.type]))

  for (const group of groups) {
    const id = group.course_category_id
    const type = id != null ? typeById.get(id) : undefined
    if (type === 2) school.push(group)
    else college.push(group)
  }

  return { college, school, other: [] as T[] }
}

export { fetchCategoryNamesByIds }
