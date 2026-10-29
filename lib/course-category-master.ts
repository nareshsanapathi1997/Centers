import { unstable_cache } from 'next/cache'
import pool from '@/lib/db'
import { normCourseCategoryName } from '@/lib/category-name-utils'

export type CourseCategoryRef = { id: number; course_name: string }

export type CourseCategoryRow = {
  id: number
  course_name: string
  type: number
  slug: string
}

/** School-level main courses (legacy type 2). */
const SCHOOL_LEVEL_NAMES = new Set(
  [
    'BBA',
    'BITSAT',
    'CLAT',
    'CUET',
    'EAPCET',
    'Hotel Management',
    'IIMB BBA DBE',
    'IIT Foundation',
    'IPM',
    'JEE/Engg',
    'MAH BBA CET',
    'MAH LAW CET',
    'NEET',
    'School Tuitions',
  ].map(normCourseCategoryName)
)

function rowType(courseName: string): number {
  return SCHOOL_LEVEL_NAMES.has(normCourseCategoryName(courseName)) ? 2 : 1
}

async function queryMainCourseRows(): Promise<CourseCategoryRow[]> {
  const result = await pool.query<{ id: number; course_name: string; slug: string }>(
    `SELECT id, title AS course_name, slug
     FROM course_masters
     WHERE level_type = 'main_course' AND is_active = true
     ORDER BY display_order, title`
  )
  return result.rows.map((row) => ({
    id: row.id,
    course_name: row.course_name,
    slug: row.slug,
    type: rowType(row.course_name),
  }))
}

export async function listMainCourseCategories(): Promise<CourseCategoryRow[]> {
  return unstable_cache(queryMainCourseRows, ['course-masters-main-categories'], {
    revalidate: 180,
    tags: ['course-masters'],
  })()
}

export async function fetchAllCategoryRefs(): Promise<CourseCategoryRef[]> {
  const rows = await listMainCourseCategories()
  return rows.map((row) => ({ id: row.id, course_name: row.course_name }))
}

export async function fetchCategoryNamesByIds(categoryIds: number[]): Promise<Map<number, string>> {
  const unique = Array.from(
    new Set(categoryIds.filter((n) => typeof n === 'number' && Number.isFinite(n) && n > 0))
  )
  const map = new Map<number, string>()
  if (unique.length === 0) return map

  const result = await pool.query<{ id: number; course_name: string }>(
    `SELECT id, title AS course_name FROM course_masters WHERE id = ANY($1::int[])`,
    [unique]
  )
  for (const row of result.rows) {
    const id = Number(row.id)
    if (Number.isFinite(id) && row.course_name) map.set(id, String(row.course_name))
  }
  return map
}

export async function validateMainCourseName(
  name: string
): Promise<{ type: number; id: number } | null> {
  const rows = await listMainCourseCategories()
  const want = normCourseCategoryName(name)
  for (const row of rows) {
    if (normCourseCategoryName(row.course_name) === want) {
      return { type: row.type, id: row.id }
    }
  }
  return null
}
