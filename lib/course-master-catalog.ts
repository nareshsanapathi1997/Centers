import { unstable_cache } from 'next/cache'
import pool from '@/lib/db'
import {
  attachCourseMasterFilterIds,
  buildCourseMasterCategoryFilters,
  type CourseMasterCategoryFilters,
  type CourseMasterTreeNode,
} from '@/lib/course-master-category-filters'

export type CatalogCourseRow = Record<string, unknown>

export type CatalogCategoryPageData = {
  courses: CatalogCourseRow[]
  filters: CourseMasterCategoryFilters
}

function mapCatalogCourseRow(
  row: Record<string, unknown>,
  mainCourseId: number,
  filterIds?: { mapped_type_id: number | null; mapped_sub_type_id: number | null }
): CatalogCourseRow {
  const price = row.price != null ? Number(row.price) : null
  const discountAmount = row.discount_amount != null ? Number(row.discount_amount) : null
  const discountPercent = row.discount_percent != null ? Number(row.discount_percent) : null

  let originalPrice = ''
  let discountedPrice = ''
  if (price != null && Number.isFinite(price) && price > 0) {
    if (discountAmount != null && Number.isFinite(discountAmount) && discountAmount > 0) {
      originalPrice = String(price)
      discountedPrice = String(Math.max(0, price - discountAmount))
    } else if (discountPercent != null && Number.isFinite(discountPercent) && discountPercent > 0) {
      originalPrice = String(price)
      discountedPrice = String(Math.max(0, Math.round(price * (1 - discountPercent / 100))))
    } else {
      discountedPrice = String(price)
    }
  }

  const offerParts: string[] = []
  if (discountPercent != null && Number(discountPercent) > 0) {
    offerParts.push(`${discountPercent}% off`)
  }
  if (row.coupon_enabled && row.coupon_code) {
    offerParts.push(`Use code ${row.coupon_code}`)
  }

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    short_description: row.short_description,
    image_url: row.image_url,
    price: row.price,
    duration: row.duration,
    mode: row.mode,
    type: row.mode,
    mapped_type_id: filterIds?.mapped_type_id ?? null,
    mapped_sub_type_id: filterIds?.mapped_sub_type_id ?? null,
    original_price: originalPrice,
    discounted_price: discountedPrice,
    offer_details: offerParts.join(' · '),
    enrollment_link: row.demo_class_link,
    category_id: mainCourseId,
  }
}

const TREE_SELECT = `
  SELECT id, parent_id, level_type, title, slug, short_description, image_url,
         price, duration, mode, display_order, is_active,
         discount_percent, discount_amount, coupon_code, coupon_enabled, demo_class_link
  FROM course_masters WHERE id = $1
  UNION ALL
  SELECT cm.id, cm.parent_id, cm.level_type, cm.title, cm.slug, cm.short_description,
         cm.image_url, cm.price, cm.duration, cm.mode, cm.display_order, cm.is_active,
         cm.discount_percent, cm.discount_amount, cm.coupon_code, cm.coupon_enabled, cm.demo_class_link
  FROM course_masters cm
  INNER JOIN tree t ON cm.parent_id = t.id
`

function buildNodeById(rows: Record<string, unknown>[]): Map<number, CourseMasterTreeNode> {
  const nodeById = new Map<number, CourseMasterTreeNode>()
  for (const row of rows) {
    const id = Number(row.id)
    if (!Number.isFinite(id)) continue
    nodeById.set(id, {
      id,
      parent_id: row.parent_id != null ? Number(row.parent_id) : null,
      level_type: String(row.level_type),
      title: String(row.title ?? ''),
      display_order: Number(row.display_order) || 0,
    })
  }
  return nodeById
}

async function queryCatalogCategoryPageUncached(
  mainCourseId: number
): Promise<CatalogCategoryPageData> {
  const result = await pool.query(
    `WITH RECURSIVE tree AS (
       ${TREE_SELECT}
     )
     SELECT * FROM tree WHERE is_active = true`,
    [mainCourseId]
  )

  const nodeById = buildNodeById(result.rows)
  const leafRows = result.rows.filter((row) => {
    const level = String(row.level_type)
    return level === 'course' || level === 'leaf_course'
  })

  leafRows.sort((a, b) => {
    const orderDiff = (Number(a.display_order) || 0) - (Number(b.display_order) || 0)
    if (orderDiff !== 0) return orderDiff
    return String(a.title ?? '').localeCompare(String(b.title ?? ''), undefined, {
      sensitivity: 'base',
    })
  })

  const courses = leafRows.map((row) => {
    const leafId = Number(row.id)
    const filterIds = attachCourseMasterFilterIds(leafId, nodeById)
    return mapCatalogCourseRow(row, mainCourseId, filterIds)
  })

  return {
    courses,
    filters: buildCourseMasterCategoryFilters(nodeById, courses),
  }
}

async function countLeafCoursesUncached(mainCourseId: number): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `WITH RECURSIVE tree AS (
       SELECT id, level_type, is_active FROM course_masters WHERE id = $1
       UNION ALL
       SELECT cm.id, cm.level_type, cm.is_active
       FROM course_masters cm
       INNER JOIN tree t ON cm.parent_id = t.id
     )
     SELECT COUNT(*)::text AS count FROM tree
     WHERE level_type IN ('course', 'leaf_course') AND is_active = true`,
    [mainCourseId]
  )
  return Number.parseInt(String(result.rows[0]?.count ?? '0'), 10) || 0
}

async function listLeafCoursesUncached(mainCourseId: number): Promise<CatalogCourseRow[]> {
  const { courses } = await queryCatalogCategoryPageUncached(mainCourseId)
  return courses
}

async function queryLeafCountsByMainCourse(): Promise<Record<number, number>> {
  const result = await pool.query<{ root_id: number; leaf_count: number }>(
    `WITH RECURSIVE tree AS (
       SELECT id AS root_id, id, parent_id, level_type, is_active
       FROM course_masters
       WHERE level_type = 'main_course'
       UNION ALL
       SELECT t.root_id, cm.id, cm.parent_id, cm.level_type, cm.is_active
       FROM course_masters cm
       INNER JOIN tree t ON cm.parent_id = t.id
     )
     SELECT root_id, COUNT(*)::int AS leaf_count
     FROM tree
     WHERE level_type IN ('course', 'leaf_course') AND is_active = true
     GROUP BY root_id`
  )
  const map: Record<number, number> = {}
  for (const row of result.rows) {
    map[Number(row.root_id)] = Number(row.leaf_count) || 0
  }
  return map
}

export async function getLeafCountsByMainCourseId(): Promise<Record<number, number>> {
  return unstable_cache(
    queryLeafCountsByMainCourse,
    ['course-master-leaf-counts-by-main-v2'],
    { revalidate: 120, tags: ['course-masters'] }
  )()
}

export async function countLeafCoursesUnderMainCourse(mainCourseId: number): Promise<number> {
  if (!Number.isFinite(mainCourseId) || mainCourseId <= 0) return 0
  return unstable_cache(
    () => countLeafCoursesUncached(mainCourseId),
    ['course-master-leaf-count', String(mainCourseId)],
    { revalidate: 120, tags: [`course-master-${mainCourseId}`] }
  )()
}

export async function listCatalogCoursesUnderMainCourse(
  mainCourseId: number
): Promise<CatalogCourseRow[]> {
  if (!Number.isFinite(mainCourseId) || mainCourseId <= 0) return []
  return unstable_cache(
    () => listLeafCoursesUncached(mainCourseId),
    ['course-master-leaf-list-v2', String(mainCourseId)],
    { revalidate: 120, tags: [`course-master-${mainCourseId}`, 'course-masters'] }
  )()
}

export async function getCatalogCategoryPageData(
  mainCourseId: number
): Promise<CatalogCategoryPageData> {
  if (!Number.isFinite(mainCourseId) || mainCourseId <= 0) {
    return {
      courses: [],
      filters: { typeRows: [], subTypesByTypeId: {}, typeNameByIdEntries: [] },
    }
  }
  return unstable_cache(
    () => queryCatalogCategoryPageUncached(mainCourseId),
    ['course-master-category-page-v1', String(mainCourseId)],
    { revalidate: 120, tags: [`course-master-${mainCourseId}`, 'course-masters'] }
  )()
}

export async function countLeafCoursesByMainCourseIds(
  mainCourseIds: number[]
): Promise<Map<number, number>> {
  const counts = new Map<number, number>()
  const unique = Array.from(new Set(mainCourseIds.filter((id) => Number.isFinite(id) && id > 0)))
  await Promise.all(
    unique.map(async (id) => {
      counts.set(id, await countLeafCoursesUnderMainCourse(id))
    })
  )
  return counts
}
