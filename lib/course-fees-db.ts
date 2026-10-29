import pool from '@/lib/db'
import type {
  CourseBaseFee,
  CourseBatchBaseFee,
  CourseBatchCenterFee,
  CourseBatchFeeRow,
  CourseCenterAssignment,
  CourseCenterFee,
  CourseFeeDiscount,
  FeeStructureInput,
  InstallmentDueRule,
  ResolvedCenterFee,
  StudentFeePayment,
} from '@/lib/course-fees-types'
import { generateReceiptNo, computeEffectiveAmount } from '@/lib/course-fees-types'
import { resolveBestCategoryIdForAssignedName } from '@/lib/category-name-utils'
import { fetchAllCategoryRefs } from '@/lib/course-category-master'
import { getLeafCountsByMainCourseId } from '@/lib/course-master-catalog'
import {
  attachCourseMasterFilterIds,
  type CourseMasterTreeNode,
} from '@/lib/course-master-category-filters'

function parseDueRules(value: unknown): InstallmentDueRule[] {
  if (!Array.isArray(value)) return []
  return value.filter((row) => row && typeof row === 'object') as InstallmentDueRule[]
}

function mapFeeRow(row: Record<string, unknown>): FeeStructureInput & Record<string, unknown> {
  return {
    ...row,
    total_amount: row.total_amount != null ? Number(row.total_amount) : 0,
    offer_amount: row.offer_amount != null ? Number(row.offer_amount) : null,
    discount_amount: row.discount_amount != null ? Number(row.discount_amount) : 0,
    registration_fee: row.registration_fee != null ? Number(row.registration_fee) : 0,
    num_installments: row.num_installments != null ? Number(row.num_installments) : 1,
    installment_1_amount:
      row.installment_1_amount != null ? Number(row.installment_1_amount) : null,
    installment_2_amount:
      row.installment_2_amount != null ? Number(row.installment_2_amount) : null,
    installment_3_amount:
      row.installment_3_amount != null ? Number(row.installment_3_amount) : null,
    installment_due_rules: parseDueRules(row.installment_due_rules),
    offer_enabled: row.offer_enabled !== false,
    payment_rules: (row.payment_rules as Record<string, unknown>) || {},
    is_active: row.is_active !== false,
  }
}

const FEE_COURSE_LEVELS = `('course', 'leaf_course')`

function treeNodeById(tree: TreeNode[]): Map<number, CourseMasterTreeNode> {
  return new Map(
    tree.map((n) => [
      n.id,
      {
        id: n.id,
        parent_id: n.parent_id,
        level_type: n.level_type,
        title: n.title,
        display_order: 0,
      },
    ]),
  )
}

function ancestorTitle(tree: TreeNode[], nodeId: number, levelType: string): string | undefined {
  const byId = new Map(tree.map((n) => [n.id, n]))
  let cur = byId.get(nodeId)
  const visited = new Set<number>()
  while (cur && !visited.has(cur.id)) {
    visited.add(cur.id)
    if (cur.level_type === levelType) return cur.title
    cur = cur.parent_id != null ? byId.get(cur.parent_id) : undefined
  }
  return undefined
}

export type FeeCourseCatalogItem = {
  course_master_id: number
  course_title: string
  course_slug: string
  main_course_id: number
  main_course_title: string
  sub_variant_id?: number | null
  sub_variant_title?: string | null
  sub_sub_variant_id?: number | null
  sub_sub_variant_title?: string | null
  category_path: string
  level_type: string
}

export type MainCourseFilterOption = {
  id: number
  title: string
  slug: string
}

type TreeNode = {
  id: number
  parent_id: number | null
  title: string
  slug: string
  level_type: string
  is_active: boolean
  main_id: number
  main_title: string
}

function categoryPath(tree: TreeNode[], nodeId: number): string {
  const byId = new Map(tree.map((n) => [n.id, n]))
  const parts: string[] = []
  let cur: TreeNode | undefined = byId.get(nodeId)
  while (cur) {
    parts.unshift(cur.title)
    cur = cur.parent_id != null ? byId.get(cur.parent_id) : undefined
  }
  return parts.join(' › ')
}

async function loadMatchedMainCourseTree(centerId: number): Promise<{
  tree: TreeNode[]
  matchedMainIds: Set<number>
  mains: MainCourseFilterOption[]
}> {
  const [centerCourses, allCategories, leafCounts, mainsResult] = await Promise.all([
    pool.query<{ name: string }>(
      'SELECT name FROM courses WHERE center_id = $1 AND is_active = true ORDER BY display_order, name',
      [centerId],
    ),
    fetchAllCategoryRefs(),
    getLeafCountsByMainCourseId(),
    pool.query<{ id: number; title: string; slug: string }>(
      `SELECT id, title, slug FROM course_masters WHERE level_type = 'main_course' AND is_active = true ORDER BY title`,
    ),
  ])

  const matchedMainIds = new Set<number>()
  for (const row of centerCourses.rows) {
    const assignedName = row.name?.trim()
    if (!assignedName) continue
    const id = resolveBestCategoryIdForAssignedName(assignedName, allCategories, leafCounts)
    if (id) matchedMainIds.add(id)
  }

  if (matchedMainIds.size === 0) {
    return { tree: [], matchedMainIds, mains: [] }
  }

  const treeResult = await pool.query<TreeNode>(
    `WITH RECURSIVE tree AS (
       SELECT id, parent_id, title, slug, level_type, is_active, id AS main_id, title AS main_title
       FROM course_masters
       WHERE id = ANY($1::int[])
       UNION ALL
       SELECT cm.id, cm.parent_id, cm.title, cm.slug, cm.level_type, cm.is_active, t.main_id, t.main_title
       FROM course_masters cm
       JOIN tree t ON cm.parent_id = t.id
     )
     SELECT * FROM tree WHERE is_active = true`,
    [Array.from(matchedMainIds)],
  )

  const slugById = new Map(mainsResult.rows.map((m) => [m.id, m.slug]))
  const mainOptions = mainsResult.rows
    .filter((m) => matchedMainIds.has(m.id))
    .map((m) => ({
      id: m.id,
      title: m.title,
      slug: slugById.get(m.id) ?? m.slug,
    }))
    .sort((a, b) => a.title.localeCompare(b.title))

  return { tree: treeResult.rows, matchedMainIds, mains: mainOptions }
}

/** Main courses (Course Masters) assigned to this center — for filter dropdowns. */
export async function listMainCoursesForCenter(
  centerId: number,
): Promise<MainCourseFilterOption[]> {
  const { mains } = await loadMatchedMainCourseTree(centerId)
  return mains
}

/** Fee-eligible course masters assigned to a center via Super Admin → Courses Management. */
export async function listFeeCoursesForCenter(centerId: number): Promise<FeeCourseCatalogItem[]> {
  const { tree, matchedMainIds } = await loadMatchedMainCourseTree(centerId)
  if (matchedMainIds.size === 0) return []

  const nodeById = treeNodeById(tree)
  const priceable: FeeCourseCatalogItem[] = []

  for (const mainId of matchedMainIds) {
    const mainRow = tree.find((r) => r.id === mainId)
    if (!mainRow) continue
    const programs = tree.filter(
      (r) => r.main_id === mainId && (r.level_type === 'course' || r.level_type === 'leaf_course'),
    )
    if (programs.length > 0) {
      for (const p of programs) {
        const filterIds = attachCourseMasterFilterIds(p.id, nodeById)
        priceable.push({
          course_master_id: p.id,
          course_title: p.title,
          course_slug: p.slug,
          main_course_id: mainId,
          main_course_title: mainRow.title,
          sub_variant_id: filterIds.mapped_type_id,
          sub_variant_title: filterIds.mapped_type_id
            ? ancestorTitle(tree, p.id, 'sub_variant')
            : null,
          sub_sub_variant_id: filterIds.mapped_sub_type_id,
          sub_sub_variant_title: filterIds.mapped_sub_type_id
            ? ancestorTitle(tree, p.id, 'sub_sub_variant')
            : null,
          category_path: categoryPath(tree, p.id),
          level_type: p.level_type,
        })
      }
    } else {
      priceable.push({
        course_master_id: mainRow.id,
        course_title: mainRow.title,
        course_slug: mainRow.slug,
        main_course_id: mainId,
        main_course_title: mainRow.title,
        category_path: mainRow.title,
        level_type: mainRow.level_type,
      })
    }
  }

  return priceable.sort(
    (a, b) =>
      a.main_course_title.localeCompare(b.main_course_title) ||
      a.category_path.localeCompare(b.category_path),
  )
}

export async function isCourseAssignedToCenter(
  courseMasterId: number,
  centerId: number,
): Promise<boolean> {
  const courses = await listFeeCoursesForCenter(centerId)
  return courses.some((c) => c.course_master_id === courseMasterId)
}

export type CenterCoursePricingRow = CourseCenterAssignment & {
  main_course_id?: number
  main_course_title?: string
  sub_variant_id?: number | null
  sub_variant_title?: string | null
  sub_sub_variant_id?: number | null
  sub_sub_variant_title?: string | null
  category_path?: string
  level_type?: string
  batch_count?: number
  batches_priced_count?: number
  has_base_fee?: boolean
  base_fee?: CourseBaseFee | null
  center_fee?: CourseCenterFee | null
  pricing_status: 'needs_pricing' | 'saved' | 'approved' | 'partial'
  base_amount: number | null
  center_amount: number | null
}

export async function listBaseFees(): Promise<CourseBaseFee[]> {
  const result = await pool.query(
    `SELECT bf.*, cm.title AS course_title, cm.slug AS course_slug
     FROM course_base_fees bf
     JOIN course_masters cm ON cm.id = bf.course_master_id
     WHERE cm.is_active = true
     ORDER BY cm.title`,
  )
  return result.rows.map((row) => mapFeeRow(row) as CourseBaseFee)
}

export async function getBaseFeeByCourseId(courseMasterId: number): Promise<CourseBaseFee | null> {
  const result = await pool.query(
    `SELECT bf.*, cm.title AS course_title, cm.slug AS course_slug
     FROM course_base_fees bf
     JOIN course_masters cm ON cm.id = bf.course_master_id
     WHERE bf.course_master_id = $1`,
    [courseMasterId],
  )
  return result.rows[0] ? (mapFeeRow(result.rows[0]) as CourseBaseFee) : null
}

export async function upsertBaseFee(
  courseMasterId: number,
  input: FeeStructureInput,
): Promise<CourseBaseFee> {
  const result = await pool.query(
    `INSERT INTO course_base_fees (
       course_master_id, total_amount, offer_amount, discount_amount, registration_fee,
       num_installments, installment_1_amount, installment_2_amount, installment_3_amount,
       installment_due_rules, offer_enabled, payment_rules, is_active
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (course_master_id) DO UPDATE SET
       total_amount = EXCLUDED.total_amount,
       offer_amount = EXCLUDED.offer_amount,
       discount_amount = EXCLUDED.discount_amount,
       registration_fee = EXCLUDED.registration_fee,
       num_installments = EXCLUDED.num_installments,
       installment_1_amount = EXCLUDED.installment_1_amount,
       installment_2_amount = EXCLUDED.installment_2_amount,
       installment_3_amount = EXCLUDED.installment_3_amount,
       installment_due_rules = EXCLUDED.installment_due_rules,
       offer_enabled = EXCLUDED.offer_enabled,
       payment_rules = EXCLUDED.payment_rules,
       is_active = EXCLUDED.is_active,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      courseMasterId,
      input.total_amount,
      input.offer_amount ?? null,
      input.discount_amount ?? 0,
      input.registration_fee ?? 0,
      input.num_installments ?? 1,
      input.installment_1_amount ?? null,
      input.installment_2_amount ?? null,
      input.installment_3_amount ?? null,
      JSON.stringify(input.installment_due_rules || []),
      input.offer_enabled !== false,
      JSON.stringify(input.payment_rules || {}),
      input.is_active !== false,
    ],
  )
  const fee = await getBaseFeeByCourseId(courseMasterId)
  return fee || (mapFeeRow(result.rows[0]) as CourseBaseFee)
}

export async function deleteBaseFee(courseMasterId: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM course_base_fees WHERE course_master_id = $1', [
    courseMasterId,
  ])
  return (result.rowCount ?? 0) > 0
}

export async function listLeafCoursesWithoutBaseFee(
  mainCourseId?: number,
): Promise<Array<FeeCourseCatalogItem>> {
  const all = await listAllFeeCatalogCourses()
  const without = all.filter((c) => !c.has_base_fee)
  if (mainCourseId) return without.filter((c) => c.main_course_id === mainCourseId)
  return without.map(({ has_base_fee: _, ...rest }) => rest)
}

export type FeeCatalogCourse = FeeCourseCatalogItem & { has_base_fee: boolean }

/** All priceable Course Masters with hierarchy (Super Admin filters). */
export async function listAllFeeCatalogCourses(): Promise<FeeCatalogCourse[]> {
  const mains = await pool.query<{ id: number; title: string; slug: string }>(
    `SELECT id, title, slug FROM course_masters WHERE level_type = 'main_course' AND is_active = true ORDER BY title`,
  )
  if (mains.rows.length === 0) return []

  const treeResult = await pool.query<TreeNode>(
    `WITH RECURSIVE tree AS (
       SELECT id, parent_id, title, slug, level_type, is_active, id AS main_id, title AS main_title
       FROM course_masters
       WHERE id = ANY($1::int[])
       UNION ALL
       SELECT cm.id, cm.parent_id, cm.title, cm.slug, cm.level_type, cm.is_active, t.main_id, t.main_title
       FROM course_masters cm
       JOIN tree t ON cm.parent_id = t.id
     )
     SELECT * FROM tree WHERE is_active = true`,
    [mains.rows.map((m) => m.id)],
  )
  const tree = treeResult.rows

  const baseFeeIds = new Set(
    (
      await pool.query<{ course_master_id: number }>(
        'SELECT course_master_id FROM course_base_fees',
      )
    ).rows.map((r) => r.course_master_id),
  )

  const items: FeeCatalogCourse[] = []
  const nodeById = treeNodeById(tree)
  for (const main of mains.rows) {
    const programs = tree.filter(
      (r) => r.main_id === main.id && (r.level_type === 'course' || r.level_type === 'leaf_course'),
    )
    if (programs.length > 0) {
      for (const p of programs) {
        const filterIds = attachCourseMasterFilterIds(p.id, nodeById)
        items.push({
          course_master_id: p.id,
          course_title: p.title,
          course_slug: p.slug,
          main_course_id: main.id,
          main_course_title: main.title,
          sub_variant_id: filterIds.mapped_type_id,
          sub_variant_title: filterIds.mapped_type_id
            ? ancestorTitle(tree, p.id, 'sub_variant')
            : null,
          sub_sub_variant_id: filterIds.mapped_sub_type_id,
          sub_sub_variant_title: filterIds.mapped_sub_type_id
            ? ancestorTitle(tree, p.id, 'sub_sub_variant')
            : null,
          category_path: categoryPath(tree, p.id),
          level_type: p.level_type,
          has_base_fee: baseFeeIds.has(p.id),
        })
      }
    } else {
      items.push({
        course_master_id: main.id,
        course_title: main.title,
        course_slug: main.slug,
        main_course_id: main.id,
        main_course_title: main.title,
        sub_variant_id: null,
        sub_variant_title: null,
        sub_sub_variant_id: null,
        sub_sub_variant_title: null,
        category_path: main.title,
        level_type: 'main_course',
        has_base_fee: baseFeeIds.has(main.id),
      })
    }
  }

  return items.sort(
    (a, b) =>
      a.main_course_title.localeCompare(b.main_course_title) ||
      a.category_path.localeCompare(b.category_path),
  )
}

export async function listAllMainCoursesForFees(): Promise<MainCourseFilterOption[]> {
  const result = await pool.query<MainCourseFilterOption>(
    `SELECT id, title, slug FROM course_masters WHERE level_type = 'main_course' AND is_active = true ORDER BY title`,
  )
  return result.rows
}

export async function listAssignments(filters?: {
  centerId?: number
  courseMasterId?: number
}): Promise<CourseCenterAssignment[]> {
  const clauses: string[] = []
  const params: unknown[] = []
  if (filters?.centerId) {
    params.push(filters.centerId)
    clauses.push(`cca.center_id = $${params.length}`)
  }
  if (filters?.courseMasterId) {
    params.push(filters.courseMasterId)
    clauses.push(`cca.course_master_id = $${params.length}`)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const result = await pool.query(
    `SELECT cca.*, cm.title AS course_title, cm.slug AS course_slug,
            c.name AS center_name, c.slug AS center_slug,
            cf.status AS center_fee_status
     FROM course_center_assignments cca
     JOIN course_masters cm ON cm.id = cca.course_master_id
     JOIN centers c ON c.id = cca.center_id
     LEFT JOIN course_center_fees cf ON cf.course_master_id = cca.course_master_id AND cf.center_id = cca.center_id
     ${where}
     ORDER BY cm.title, c.name`,
    params,
  )
  return result.rows
}

export async function assignCourseToCenters(
  courseMasterId: number,
  centerIds: number[],
  options?: { allow_center_override?: boolean; admin_can_customize?: boolean },
): Promise<CourseCenterAssignment[]> {
  for (const centerId of centerIds) {
    await pool.query(
      `INSERT INTO course_center_assignments (course_master_id, center_id, allow_center_override, admin_can_customize, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (course_master_id, center_id) DO UPDATE SET
         allow_center_override = EXCLUDED.allow_center_override,
         admin_can_customize = EXCLUDED.admin_can_customize,
         status = 'active'`,
      [
        courseMasterId,
        centerId,
        options?.allow_center_override !== false,
        options?.admin_can_customize !== false,
      ],
    )
  }
  return listAssignments({ courseMasterId })
}

export async function removeAssignment(courseMasterId: number, centerId: number): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM course_center_assignments WHERE course_master_id = $1 AND center_id = $2',
    [courseMasterId, centerId],
  )
  return (result.rowCount ?? 0) > 0
}

export async function listDiscounts(filters?: {
  courseMasterId?: number
  centerId?: number
}): Promise<CourseFeeDiscount[]> {
  const clauses: string[] = []
  const params: unknown[] = []
  if (filters?.courseMasterId) {
    params.push(filters.courseMasterId)
    clauses.push(`d.course_master_id = $${params.length}`)
  }
  if (filters?.centerId) {
    params.push(filters.centerId)
    clauses.push(`(d.center_id = $${params.length} OR d.center_id IS NULL)`)
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const result = await pool.query(
    `SELECT d.*, cm.title AS course_title, c.name AS center_name
     FROM course_fee_discounts d
     JOIN course_masters cm ON cm.id = d.course_master_id
     LEFT JOIN centers c ON c.id = d.center_id
     ${where}
     ORDER BY d.created_at DESC`,
    params,
  )
  return result.rows.map((row) => ({
    ...row,
    discount_value: Number(row.discount_value),
  }))
}

export async function createDiscount(input: {
  course_master_id: number
  center_id?: number | null
  name: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  coupon_code?: string | null
  is_active?: boolean
}): Promise<CourseFeeDiscount> {
  const result = await pool.query(
    `INSERT INTO course_fee_discounts (course_master_id, center_id, name, discount_type, discount_value, coupon_code, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      input.course_master_id,
      input.center_id ?? null,
      input.name,
      input.discount_type,
      input.discount_value,
      input.coupon_code ?? null,
      input.is_active !== false,
    ],
  )
  return {
    ...result.rows[0],
    discount_value: Number(result.rows[0].discount_value),
  }
}

/** Creates one global discount (no centers) or one row per selected center. */
export async function createDiscounts(input: {
  course_master_id: number
  center_ids?: number[] | null
  name: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  coupon_code?: string | null
  is_active?: boolean
}): Promise<CourseFeeDiscount[]> {
  const centerIds = [
    ...new Set((input.center_ids || []).filter((id) => Number.isFinite(id) && id > 0)),
  ]
  if (centerIds.length === 0) {
    return [await createDiscount({ ...input, center_id: null })]
  }
  const created: CourseFeeDiscount[] = []
  for (const center_id of centerIds) {
    created.push(await createDiscount({ ...input, center_id }))
  }
  return created
}

export async function deleteDiscount(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM course_fee_discounts WHERE id = $1', [id])
  return (result.rowCount ?? 0) > 0
}

export async function getCenterFee(
  courseMasterId: number,
  centerId: number,
): Promise<CourseCenterFee | null> {
  const result = await pool.query(
    `SELECT cf.*, cm.title AS course_title, cm.slug AS course_slug, c.name AS center_name
     FROM course_center_fees cf
     JOIN course_masters cm ON cm.id = cf.course_master_id
     JOIN centers c ON c.id = cf.center_id
     WHERE cf.course_master_id = $1 AND cf.center_id = $2`,
    [courseMasterId, centerId],
  )
  if (!result.rows[0]) return null
  const row = mapFeeRow(result.rows[0])
  return {
    ...row,
    additional_discounts: result.rows[0].additional_discounts || [],
    configured_by: result.rows[0].configured_by,
    status: result.rows[0].status,
  } as CourseCenterFee
}

export async function upsertCenterFee(
  courseMasterId: number,
  centerId: number,
  input: FeeStructureInput & {
    additional_discounts?: unknown[]
    configured_by?: 'admin' | 'center'
    status?: CourseCenterFee['status']
  },
): Promise<CourseCenterFee> {
  const status = input.status || 'saved'
  await pool.query(
    `INSERT INTO course_center_fees (
       course_master_id, center_id, total_amount, offer_amount, discount_amount, registration_fee,
       num_installments, installment_1_amount, installment_2_amount, installment_3_amount,
       installment_due_rules, additional_discounts, configured_by, status, saved_at, approved_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
       CASE WHEN $14 IN ('saved','approved') THEN CURRENT_TIMESTAMP ELSE NULL END,
       CASE WHEN $14 = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END)
     ON CONFLICT (course_master_id, center_id) DO UPDATE SET
       total_amount = EXCLUDED.total_amount,
       offer_amount = EXCLUDED.offer_amount,
       discount_amount = EXCLUDED.discount_amount,
       registration_fee = EXCLUDED.registration_fee,
       num_installments = EXCLUDED.num_installments,
       installment_1_amount = EXCLUDED.installment_1_amount,
       installment_2_amount = EXCLUDED.installment_2_amount,
       installment_3_amount = EXCLUDED.installment_3_amount,
       installment_due_rules = EXCLUDED.installment_due_rules,
       additional_discounts = EXCLUDED.additional_discounts,
       configured_by = EXCLUDED.configured_by,
       status = EXCLUDED.status,
       saved_at = CASE WHEN EXCLUDED.status IN ('saved','approved') THEN CURRENT_TIMESTAMP ELSE course_center_fees.saved_at END,
       approved_at = CASE WHEN EXCLUDED.status = 'approved' THEN CURRENT_TIMESTAMP ELSE course_center_fees.approved_at END,
       updated_at = CURRENT_TIMESTAMP`,
    [
      courseMasterId,
      centerId,
      input.total_amount,
      input.offer_amount ?? null,
      input.discount_amount ?? 0,
      input.registration_fee ?? 0,
      input.num_installments ?? 1,
      input.installment_1_amount ?? null,
      input.installment_2_amount ?? null,
      input.installment_3_amount ?? null,
      JSON.stringify(input.installment_due_rules || []),
      JSON.stringify(input.additional_discounts || []),
      input.configured_by || 'center',
      status,
    ],
  )
  const fee = await getCenterFee(courseMasterId, centerId)
  if (!fee) throw new Error('Failed to save center fee')
  return fee
}

export async function resolveCenterFee(
  courseMasterId: number,
  centerId: number,
  batchId?: number | null,
): Promise<ResolvedCenterFee | null> {
  const assigned = await isCourseAssignedToCenter(courseMasterId, centerId)
  if (!assigned) return null

  if (batchId) {
    const owner = await pool.query('SELECT course_master_id FROM course_master_batches WHERE id = $1', [batchId])
    if (!owner.rows[0] || Number(owner.rows[0].course_master_id) !== Number(courseMasterId)) return null
    const batchCenter = await getBatchCenterFee(batchId, centerId)
    // Batch must belong to this course � otherwise a cheaper batch of another
    // course at the same centre could be used to price this course.
    if (batchCenter && Number(batchCenter.course_master_id) !== Number(courseMasterId)) return null
    if (batchCenter && ['saved', 'approved'].includes(batchCenter.status)) {
      return {
        ...batchCenter,
        source: 'batch_center',
        course_master_id: courseMasterId,
        center_id: centerId,
        batch_id: batchId,
        payment_available: true,
      }
    }
    const batchBase = await getBatchBaseFee(batchId)
    if (batchBase && Number(batchBase.course_master_id) !== Number(courseMasterId)) return null
    if (batchBase && batchBase.is_active !== false) {
      return {
        ...batchBase,
        source: 'batch_base',
        course_master_id: courseMasterId,
        center_id: centerId,
        batch_id: batchId,
        payment_available: false,
      }
    }
  }

  const centerFee = await getCenterFee(courseMasterId, centerId)
  if (centerFee && ['saved', 'approved'].includes(centerFee.status)) {
    return {
      ...centerFee,
      source: 'center',
      course_master_id: courseMasterId,
      center_id: centerId,
      batch_id: null,
      payment_available: true,
    }
  }

  const baseFee = await getBaseFeeByCourseId(courseMasterId)
  if (baseFee && baseFee.is_active !== false) {
    return {
      ...baseFee,
      source: 'base',
      course_master_id: courseMasterId,
      center_id: centerId,
      batch_id: null,
      payment_available: false,
    }
  }

  return null
}

export type PublicFeeResolution = {
  course: { id: number; title: string; slug: string }
  fee: ResolvedCenterFee | null
  payment_available: boolean
  requires_batch_selection: boolean
  batches: CourseBatchFeeRow[]
}

export async function resolvePublicCourseFee(
  courseMasterId: number,
  centerId: number,
  batchId?: number | null,
): Promise<PublicFeeResolution | null> {
  const courseResult = await pool.query<{
    id: number
    title: string
    slug: string
  }>('SELECT id, title, slug FROM course_masters WHERE id = $1 AND is_active = true', [
    courseMasterId,
  ])
  const course = courseResult.rows[0]
  if (!course) return null

  const batches = await listCourseBatchesWithFees(courseMasterId, centerId)
  if (batches.length > 0 && !batchId) {
    return {
      course,
      fee: null,
      payment_available: false,
      requires_batch_selection: true,
      batches,
    }
  }

  const fee = await resolveCenterFee(courseMasterId, centerId, batchId ?? null)
  if (!fee) return null

  return {
    course,
    fee,
    payment_available: fee.payment_available,
    requires_batch_selection: false,
    batches,
  }
}

export async function listCenterAssignedCourses(
  centerId: number,
): Promise<CenterCoursePricingRow[]> {
  const centerResult = await pool.query('SELECT name, slug FROM centers WHERE id = $1', [centerId])
  const centerName = centerResult.rows[0]?.name || ''
  const centerSlug = centerResult.rows[0]?.slug || ''

  const feeCourses = await listFeeCoursesForCenter(centerId)
  const courseIds = feeCourses.map((c) => c.course_master_id)

  // Three set-based queries instead of three per course, plus the batch fees
  // in one pass — this endpoint used to scale linearly with the catalog size.
  const [centerFeeByCourse, baseFeeByCourse, batchesByCourse] = await Promise.all([
    getCenterFeesForCourses(courseIds, centerId),
    getBaseFeesForCourses(courseIds),
    listBatchesWithFeesForCourses(courseIds, centerId),
  ])

  const enriched = feeCourses.map((course) => {
    const centerFee = centerFeeByCourse.get(course.course_master_id) ?? null
    const baseFee = baseFeeByCourse.get(course.course_master_id) ?? null
    const batches = batchesByCourse.get(course.course_master_id) ?? []

    const batchCount = batches.length
    const batchesPriced = batches.filter((b) => b.has_center_fee).length
    const courseCenterSaved = centerFee != null && ['saved', 'approved'].includes(centerFee.status)

    let centerAmount: number | null = null
    if (courseCenterSaved && centerFee) {
      centerAmount = computeEffectiveAmount(centerFee)
    } else if (batchCount > 0 && batchesPriced > 0) {
      const priced = batches.filter((b) => b.center_amount != null)
      if (priced.length > 0) {
        centerAmount = Math.min(...priced.map((b) => b.center_amount!))
      }
    }

    const baseAmount = baseFee ? computeEffectiveAmount(baseFee) : null

    let pricingStatus: CenterCoursePricingRow['pricing_status'] = 'needs_pricing'
    if (courseCenterSaved) {
      pricingStatus = centerFee?.status === 'approved' ? 'approved' : 'saved'
    } else if (batchCount > 0) {
      if (batchesPriced === batchCount) pricingStatus = 'saved'
      else if (batchesPriced > 0) pricingStatus = 'partial'
    }

    return {
      id: course.course_master_id,
      course_master_id: course.course_master_id,
      center_id: centerId,
      allow_center_override: true,
      admin_can_customize: true,
      status: 'active' as const,
      course_title: course.course_title,
      course_slug: course.course_slug,
      main_course_id: course.main_course_id,
      main_course_title: course.main_course_title,
      sub_variant_id: course.sub_variant_id,
      sub_variant_title: course.sub_variant_title,
      sub_sub_variant_id: course.sub_sub_variant_id,
      sub_sub_variant_title: course.sub_sub_variant_title,
      category_path: course.category_path,
      level_type: course.level_type,
      batch_count: batchCount,
      batches_priced_count: batchesPriced,
      has_base_fee: !!baseFee || batches.some((b) => b.has_base_fee),
      center_name: centerName,
      center_slug: centerSlug,
      center_fee_status: centerFee?.status || null,
      base_fee: baseFee,
      center_fee: centerFee,
      pricing_status: pricingStatus,
      base_amount: baseAmount,
      center_amount: centerAmount,
    }
  })
  return enriched
}

/** Center fee overrides for many courses in one query. */
export async function getCenterFeesForCourses(
  courseMasterIds: number[],
  centerId: number,
): Promise<Map<number, CourseCenterFee>> {
  const out = new Map<number, CourseCenterFee>()
  const ids = [...new Set(courseMasterIds.filter((id) => Number.isFinite(id)))]
  if (ids.length === 0) return out

  const result = await pool.query(
    `SELECT cf.*, cm.title AS course_title, cm.slug AS course_slug, c.name AS center_name
     FROM course_center_fees cf
     JOIN course_masters cm ON cm.id = cf.course_master_id
     JOIN centers c ON c.id = cf.center_id
     WHERE cf.course_master_id = ANY($1::int[]) AND cf.center_id = $2`,
    [ids, centerId],
  )

  for (const row of result.rows) {
    out.set(Number(row.course_master_id), {
      ...mapFeeRow(row),
      additional_discounts: row.additional_discounts || [],
      configured_by: row.configured_by,
      status: row.status,
    } as CourseCenterFee)
  }
  return out
}

/** Platform base fees for many courses in one query. */
export async function getBaseFeesForCourses(
  courseMasterIds: number[],
): Promise<Map<number, CourseBaseFee>> {
  const out = new Map<number, CourseBaseFee>()
  const ids = [...new Set(courseMasterIds.filter((id) => Number.isFinite(id)))]
  if (ids.length === 0) return out

  const result = await pool.query(
    `SELECT bf.*, cm.title AS course_title, cm.slug AS course_slug
     FROM course_base_fees bf
     JOIN course_masters cm ON cm.id = bf.course_master_id
     WHERE bf.course_master_id = ANY($1::int[])`,
    [ids],
  )

  for (const row of result.rows) {
    out.set(Number(row.course_master_id), mapFeeRow(row) as CourseBaseFee)
  }
  return out
}

export async function listStudentPayments(filters?: {
  centerId?: number
  courseMasterId?: number
  search?: string
  status?: StudentFeePayment['status']
}): Promise<StudentFeePayment[]> {
  const clauses: string[] = []
  const params: unknown[] = []
  if (filters?.centerId) {
    params.push(filters.centerId)
    clauses.push(`p.center_id = $${params.length}`)
  }
  if (filters?.courseMasterId) {
    params.push(filters.courseMasterId)
    clauses.push(`p.course_master_id = $${params.length}`)
  }
  if (filters?.status) {
    params.push(filters.status)
    clauses.push(`p.status = $${params.length}`)
  }
  if (filters?.search?.trim()) {
    params.push(`%${filters.search.trim()}%`)
    clauses.push(
      `(p.student_name ILIKE $${params.length} OR p.student_mobile ILIKE $${params.length} OR p.receipt_no ILIKE $${params.length})`,
    )
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const result = await pool.query(
    `SELECT p.*, cm.title AS course_title, c.name AS center_name
     FROM student_fee_payments p
     JOIN course_masters cm ON cm.id = p.course_master_id
     JOIN centers c ON c.id = p.center_id
     ${where}
     ORDER BY p.created_at DESC`,
    params,
  )
  return result.rows.map((row) => ({
    ...row,
    amount_due: Number(row.amount_due),
    amount_paid: Number(row.amount_paid),
    discount_applied: Number(row.discount_applied),
  }))
}

export type PendingFeeApproval = {
  course_master_id: number
  center_id: number
  course_title: string
  course_slug: string
  center_name: string
  center_slug: string
  configured_by: string
  saved_at: string | null
  batch_count: number
}

export async function listPendingFeeApprovals(): Promise<PendingFeeApproval[]> {
  const result = await pool.query(
    `SELECT cf.course_master_id, cf.center_id, cf.configured_by, cf.saved_at,
            cm.title AS course_title, cm.slug AS course_slug,
            c.name AS center_name, c.slug AS center_slug,
            (SELECT COUNT(*)::int FROM course_master_batches b WHERE b.course_master_id = cf.course_master_id AND b.is_active = true) AS batch_count
     FROM course_center_fees cf
     JOIN course_masters cm ON cm.id = cf.course_master_id
     JOIN centers c ON c.id = cf.center_id
     WHERE cf.status = 'saved' AND cf.configured_by = 'center'
     ORDER BY cf.saved_at DESC NULLS LAST`,
  )
  return result.rows.map((row) => ({
    ...row,
    batch_count: Number(row.batch_count) || 0,
  }))
}

export async function getPaymentById(
  paymentId: number,
  centerId?: number,
): Promise<StudentFeePayment | null> {
  const params: unknown[] = [paymentId]
  let where = 'p.id = $1'
  if (centerId) {
    params.push(centerId)
    where += ` AND p.center_id = $${params.length}`
  }
  const result = await pool.query(
    `SELECT p.*, cm.title AS course_title, c.name AS center_name
     FROM student_fee_payments p
     JOIN course_masters cm ON cm.id = p.course_master_id
     JOIN centers c ON c.id = p.center_id
     WHERE ${where}`,
    params,
  )
  if (!result.rows[0]) return null
  const row = result.rows[0]
  return {
    ...row,
    amount_due: Number(row.amount_due),
    amount_paid: Number(row.amount_paid),
    discount_applied: Number(row.discount_applied),
  }
}

export async function createStudentPayment(input: {
  center_id: number
  course_master_id: number
  student_name: string
  student_email?: string | null
  student_mobile: string
  payment_type?: 'lumpsum' | 'installment'
  installment_no?: number | null
  fee_snapshot: Record<string, unknown>
  amount_due: number
  amount_paid: number
  discount_applied?: number
  payment_method?: string | null
  transaction_id?: string | null
  status?: StudentFeePayment['status']
  notes?: string | null
}): Promise<StudentFeePayment> {
  const receiptNo = generateReceiptNo()
  const result = await pool.query(
    `INSERT INTO student_fee_payments (
       receipt_no, center_id, course_master_id, student_name, student_email, student_mobile,
       payment_type, installment_no, fee_snapshot, amount_due, amount_paid, discount_applied,
       payment_method, transaction_id, status, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
    [
      receiptNo,
      input.center_id,
      input.course_master_id,
      input.student_name,
      input.student_email ?? null,
      input.student_mobile,
      input.payment_type || 'lumpsum',
      input.installment_no ?? null,
      JSON.stringify(input.fee_snapshot),
      input.amount_due,
      input.amount_paid,
      input.discount_applied ?? 0,
      input.payment_method ?? null,
      input.transaction_id ?? null,
      input.status || 'completed',
      input.notes ?? null,
    ],
  )
  return {
    ...result.rows[0],
    amount_due: Number(result.rows[0].amount_due),
    amount_paid: Number(result.rows[0].amount_paid),
    discount_applied: Number(result.rows[0].discount_applied),
  }
}

export async function getCenterIdBySlug(slug: string): Promise<number | null> {
  const result = await pool.query('SELECT id FROM centers WHERE slug = $1 AND is_active = true', [
    slug,
  ])
  return result.rows[0]?.id ?? null
}

export async function getCourseMasterIdBySlugOrId(
  courseKey: string,
): Promise<{ id: number; title: string; slug: string } | null> {
  const numeric = Number(courseKey)
  if (Number.isFinite(numeric) && numeric > 0) {
    const result = await pool.query(
      'SELECT id, title, slug FROM course_masters WHERE id = $1 AND is_active = true',
      [numeric],
    )
    return result.rows[0] ?? null
  }
  const result = await pool.query(
    'SELECT id, title, slug FROM course_masters WHERE slug = $1 AND is_active = true',
    [courseKey],
  )
  return result.rows[0] ?? null
}

const FEE_UPSERT_COLUMNS = `
  total_amount, offer_amount, discount_amount, registration_fee,
  num_installments, installment_1_amount, installment_2_amount, installment_3_amount,
  installment_due_rules, offer_enabled, payment_rules, is_active
`

function feeUpsertValues(input: FeeStructureInput): unknown[] {
  return [
    input.total_amount,
    input.offer_amount ?? null,
    input.discount_amount ?? 0,
    input.registration_fee ?? 0,
    input.num_installments ?? 1,
    input.installment_1_amount ?? null,
    input.installment_2_amount ?? null,
    input.installment_3_amount ?? null,
    JSON.stringify(input.installment_due_rules || []),
    input.offer_enabled !== false,
    JSON.stringify(input.payment_rules || {}),
    input.is_active !== false,
  ]
}

export async function listCourseBatchesWithFees(
  courseMasterId: number,
  centerId?: number,
): Promise<CourseBatchFeeRow[]> {
  const byCourse = await listBatchesWithFeesForCourses([courseMasterId], centerId)
  return byCourse.get(courseMasterId) ?? []
}

/**
 * Batches, with their base and center fees, for many courses at once.
 *
 * This replaces a per-course + per-batch fetch: the previous shape issued
 * 1 + 2N queries per course, so a center with 40 courses × 5 batches produced
 * several hundred round trips for one page load. Here it is always 3 queries
 * regardless of size.
 */
export async function listBatchesWithFeesForCourses(
  courseMasterIds: number[],
  centerId?: number,
): Promise<Map<number, CourseBatchFeeRow[]>> {
  const result = new Map<number, CourseBatchFeeRow[]>()
  const ids = [...new Set(courseMasterIds.filter((id) => Number.isFinite(id)))]
  if (ids.length === 0) return result

  const batchResult = await pool.query<{
    id: number
    course_master_id: number
    batch_name: string | null
    batch_timing: string | null
    start_date: string
    is_active: boolean
  }>(
    `SELECT id, course_master_id, batch_name, batch_timing, start_date, is_active
     FROM course_master_batches
     WHERE course_master_id = ANY($1::int[]) AND is_active = true
     ORDER BY course_master_id, display_order, start_date`,
    [ids],
  )

  const batchIds = batchResult.rows.map((b) => b.id)
  if (batchIds.length === 0) {
    for (const id of ids) result.set(id, [])
    return result
  }

  const [baseFeeResult, centerFeeResult] = await Promise.all([
    pool.query(
      `SELECT bf.*, cm.title AS course_title, cm.slug AS course_slug, b.batch_name
       FROM course_batch_base_fees bf
       JOIN course_masters cm ON cm.id = bf.course_master_id
       JOIN course_master_batches b ON b.id = bf.batch_id
       WHERE bf.batch_id = ANY($1::int[])`,
      [batchIds],
    ),
    centerId
      ? pool.query(
          `SELECT cf.*, cm.title AS course_title, cm.slug AS course_slug, c.name AS center_name, b.batch_name
           FROM course_batch_center_fees cf
           JOIN course_masters cm ON cm.id = cf.course_master_id
           JOIN centers c ON c.id = cf.center_id
           JOIN course_master_batches b ON b.id = cf.batch_id
           WHERE cf.batch_id = ANY($1::int[]) AND cf.center_id = $2`,
          [batchIds, centerId],
        )
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
  ])

  const baseFeeByBatch = new Map<number, CourseBatchBaseFee>()
  for (const row of baseFeeResult.rows) {
    baseFeeByBatch.set(Number(row.batch_id), mapFeeRow(row) as CourseBatchBaseFee)
  }

  const centerFeeByBatch = new Map<number, CourseBatchCenterFee>()
  for (const row of centerFeeResult.rows) {
    const mapped = mapFeeRow(row)
    centerFeeByBatch.set(Number(row.batch_id), {
      ...mapped,
      additional_discounts: row.additional_discounts || [],
      configured_by: row.configured_by,
      status: row.status,
    } as CourseBatchCenterFee)
  }

  for (const id of ids) result.set(id, [])
  for (const batch of batchResult.rows) {
    const baseFee = baseFeeByBatch.get(batch.id) ?? null
    const centerFee = centerFeeByBatch.get(batch.id) ?? null
    const hasCenterFee = !!(centerFee && ['saved', 'approved'].includes(centerFee.status))
    result.get(batch.course_master_id)!.push({
      id: batch.id,
      course_master_id: batch.course_master_id,
      batch_name: batch.batch_name,
      batch_timing: batch.batch_timing,
      start_date: batch.start_date,
      is_active: batch.is_active,
      has_base_fee: !!baseFee,
      has_center_fee: hasCenterFee,
      base_amount: baseFee ? computeEffectiveAmount(baseFee) : null,
      center_amount: hasCenterFee ? computeEffectiveAmount(centerFee!) : null,
    })
  }

  return result
}

export async function getBatchBaseFee(batchId: number): Promise<CourseBatchBaseFee | null> {
  const result = await pool.query(
    `SELECT bf.*, cm.title AS course_title, cm.slug AS course_slug, b.batch_name
     FROM course_batch_base_fees bf
     JOIN course_masters cm ON cm.id = bf.course_master_id
     JOIN course_master_batches b ON b.id = bf.batch_id
     WHERE bf.batch_id = $1`,
    [batchId],
  )
  return result.rows[0] ? (mapFeeRow(result.rows[0]) as CourseBatchBaseFee) : null
}

export async function upsertBatchBaseFee(
  batchId: number,
  courseMasterId: number,
  input: FeeStructureInput,
): Promise<CourseBatchBaseFee> {
  const values = feeUpsertValues(input)
  await pool.query(
    `INSERT INTO course_batch_base_fees (batch_id, course_master_id, ${FEE_UPSERT_COLUMNS})
     VALUES ($1, $2, $3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (batch_id) DO UPDATE SET
       course_master_id = EXCLUDED.course_master_id,
       total_amount = EXCLUDED.total_amount,
       offer_amount = EXCLUDED.offer_amount,
       discount_amount = EXCLUDED.discount_amount,
       registration_fee = EXCLUDED.registration_fee,
       num_installments = EXCLUDED.num_installments,
       installment_1_amount = EXCLUDED.installment_1_amount,
       installment_2_amount = EXCLUDED.installment_2_amount,
       installment_3_amount = EXCLUDED.installment_3_amount,
       installment_due_rules = EXCLUDED.installment_due_rules,
       offer_enabled = EXCLUDED.offer_enabled,
       payment_rules = EXCLUDED.payment_rules,
       is_active = EXCLUDED.is_active,
       updated_at = CURRENT_TIMESTAMP`,
    [batchId, courseMasterId, ...values],
  )
  const fee = await getBatchBaseFee(batchId)
  if (!fee) throw new Error('Failed to save batch base fee')
  return fee
}

export async function getBatchCenterFee(
  batchId: number,
  centerId: number,
): Promise<CourseBatchCenterFee | null> {
  const result = await pool.query(
    `SELECT cf.*, cm.title AS course_title, cm.slug AS course_slug, c.name AS center_name, b.batch_name
     FROM course_batch_center_fees cf
     JOIN course_masters cm ON cm.id = cf.course_master_id
     JOIN centers c ON c.id = cf.center_id
     JOIN course_master_batches b ON b.id = cf.batch_id
     WHERE cf.batch_id = $1 AND cf.center_id = $2`,
    [batchId, centerId],
  )
  if (!result.rows[0]) return null
  const row = mapFeeRow(result.rows[0])
  return {
    ...row,
    additional_discounts: result.rows[0].additional_discounts || [],
    configured_by: result.rows[0].configured_by,
    status: result.rows[0].status,
  } as CourseBatchCenterFee
}

export async function upsertBatchCenterFee(
  batchId: number,
  courseMasterId: number,
  centerId: number,
  input: FeeStructureInput & {
    additional_discounts?: unknown[]
    configured_by?: 'admin' | 'center'
    status?: 'draft' | 'saved' | 'approved' | 'rejected'
  },
): Promise<CourseBatchCenterFee> {
  const values = feeUpsertValues(input)
  await pool.query(
    `INSERT INTO course_batch_center_fees (
       batch_id, course_master_id, center_id, ${FEE_UPSERT_COLUMNS},
       additional_discounts, configured_by, status, saved_at
     ) VALUES ($1, $2, $3, $4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, $16, $17, $18, CASE WHEN $18 IN ('saved','approved') THEN CURRENT_TIMESTAMP ELSE NULL END)
     ON CONFLICT (batch_id, center_id) DO UPDATE SET
       total_amount = EXCLUDED.total_amount,
       offer_amount = EXCLUDED.offer_amount,
       discount_amount = EXCLUDED.discount_amount,
       registration_fee = EXCLUDED.registration_fee,
       num_installments = EXCLUDED.num_installments,
       installment_1_amount = EXCLUDED.installment_1_amount,
       installment_2_amount = EXCLUDED.installment_2_amount,
       installment_3_amount = EXCLUDED.installment_3_amount,
       installment_due_rules = EXCLUDED.installment_due_rules,
       offer_enabled = EXCLUDED.offer_enabled,
       payment_rules = EXCLUDED.payment_rules,
       is_active = EXCLUDED.is_active,
       additional_discounts = EXCLUDED.additional_discounts,
       configured_by = EXCLUDED.configured_by,
       status = EXCLUDED.status,
       saved_at = CASE WHEN EXCLUDED.status IN ('saved','approved') THEN CURRENT_TIMESTAMP ELSE course_batch_center_fees.saved_at END,
       updated_at = CURRENT_TIMESTAMP`,
    [
      batchId,
      courseMasterId,
      centerId,
      ...values,
      JSON.stringify(input.additional_discounts || []),
      input.configured_by || 'center',
      input.status || 'saved',
    ],
  )
  const fee = await getBatchCenterFee(batchId, centerId)
  if (!fee) throw new Error('Failed to save batch center fee')
  return fee
}
