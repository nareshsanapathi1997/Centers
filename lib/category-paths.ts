import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import pool from '@/lib/db'
import { normCourseCategoryName, resolveBestCategoryIdForAssignedName } from '@/lib/category-name-utils'
import { getLeafCountsByMainCourseId } from '@/lib/course-master-catalog'

type CategoryRow = { course_name: string; id: number; slug: string | null }

const loadCourseCategoryRows = unstable_cache(
  async (): Promise<CategoryRow[]> => {
    const result = await pool.query<{ id: number; course_name: string; slug: string }>(
      `SELECT id, title AS course_name, slug FROM course_masters
       WHERE level_type = 'main_course' AND is_active = true
       ORDER BY display_order, title`
    )
    return result.rows
  },
  ['course-master-category-rows-v2'],
  { revalidate: 180, tags: ['course-masters'] }
)

function normalizeUniqueSorted(names: string[]): string[] {
  return Array.from(
    new Set(
      names
        .map((n) => (typeof n === 'string' ? n.trim() : ''))
        .filter((n) => n.length > 0)
    )
  ).sort()
}

function cacheKeyForNames(names: string[]): string | null {
  const unique = normalizeUniqueSorted(names)
  if (unique.length === 0) return null
  return unique.join('\u0001')
}

type CategoryMaps = {
  pathByName: Record<string, string>
  idByCourseName: Record<string, number>
}

const getCategoryMapsByKey = cache(async (key: string): Promise<CategoryMaps> => {
  const unique = key.split('\u0001').filter(Boolean)
  const [rows, leafCounts] = await Promise.all([loadCourseCategoryRows(), getLeafCountsByMainCourseId()])

  const segmentById = new Map<number, string>()
  for (const row of rows) {
    const name = row.course_name != null ? String(row.course_name) : ''
    if (!name) continue
    const s = row.slug != null ? String(row.slug).trim() : ''
    const segment = s && s !== '-1' ? s : String(row.id)
    const id = Number(row.id)
    if (Number.isFinite(id) && id > 0) segmentById.set(id, segment)
  }

  const pathByName: Record<string, string> = {}
  const idByCourseName: Record<string, number> = {}
  const allRefs = rows.map((row) => ({
    id: Number(row.id),
    course_name: String(row.course_name ?? '').trim(),
  }))
  for (const requested of unique) {
    const id = resolveBestCategoryIdForAssignedName(requested, allRefs, leafCounts)
    if (id != null && Number.isFinite(id)) idByCourseName[requested] = id
    const segment = id != null ? segmentById.get(id) : undefined
    if (segment) pathByName[requested] = segment
  }

  return { pathByName, idByCourseName }
})

export async function getCategoryMapsForCourseNames(names: string[]): Promise<CategoryMaps> {
  const key = cacheKeyForNames(names)
  if (!key) return { pathByName: {}, idByCourseName: {} }
  return getCategoryMapsByKey(key)
}

export async function getCategoryPathByCourseNames(names: string[]): Promise<Record<string, string>> {
  const { pathByName } = await getCategoryMapsForCourseNames(names)
  return pathByName
}

export async function getCourseCategoryIdsByCourseNames(
  names: string[]
): Promise<Record<string, number>> {
  const { idByCourseName } = await getCategoryMapsForCourseNames(names)
  return idByCourseName
}

export { getCategoryIdForCourseName } from '@/lib/category-name-utils'
