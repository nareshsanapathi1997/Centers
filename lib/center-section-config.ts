import pool from '@/lib/db'
import { centerHasAssignedCatalogCategories } from '@/lib/center-catalog-courses'
import { unstable_cache } from 'next/cache'

export const COURSES_SECTION_KEY = 'courses'

const catalogCache = new Map<string, { value: boolean; expiresAt: number }>()
const CATALOG_TTL_MS = 120_000

async function queryCenterHasCatalogCourses(slug: string): Promise<boolean> {
  try {
    const result = await pool.query<{ id: number }>(
      'SELECT id FROM centers WHERE slug = $1 LIMIT 1',
      [slug.trim()]
    )
    const centerId = result.rows[0]?.id
    if (centerId == null) return false
    return centerHasAssignedCatalogCategories(centerId)
  } catch {
    return false
  }
}

export async function centerHasCatalogCourses(slug: string): Promise<boolean> {
  const key = slug.trim()
  const mem = catalogCache.get(key)
  if (mem && mem.expiresAt > Date.now()) return mem.value

  const value = await unstable_cache(
    () => queryCenterHasCatalogCourses(key),
    ['center-catalog-courses', key],
    { revalidate: 120, tags: [`center-catalog-${key}`] },
  )()

  catalogCache.set(key, { value, expiresAt: Date.now() + CATALOG_TTL_MS })
  return value
}

export async function centerHasCatalogCoursesById(centerId: number): Promise<boolean> {
  const result = await pool.query<{ slug: string }>(
    'SELECT slug FROM centers WHERE id = $1',
    [centerId],
  )
  const slug = result.rows[0]?.slug?.trim()
  if (!slug) return false
  return centerHasCatalogCourses(slug)
}

export async function getCoursesSectionConfig(centerId: number) {
  const result = await pool.query(
    'SELECT id, section_key, is_enabled, display_order FROM section_configs WHERE center_id = $1 AND section_key = $2',
    [centerId, COURSES_SECTION_KEY],
  )
  return result.rows[0] ?? null
}
