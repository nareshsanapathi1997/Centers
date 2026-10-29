import pool from './db'
import {
  ALLOWED_CHILD_LEVELS,
  ALLOWED_PARENT_LEVELS,
  CourseMasterLevel,
  isDetailLevel,
  slugify,
} from './course-masters'

export interface CourseMasterBatchInput {
  id?: number
  batch_name?: string
  batch_timing?: string
  schedule_days?: string
  start_date: string
  end_date?: string
  enrollment_deadline?: string
  capacity?: number
  price?: number
  discount_percent?: number
  discount_amount?: number
  coupon_code?: string
  coupon_enabled?: boolean
  installment_config?: unknown
  notes?: string
  is_active?: boolean
  display_order?: number
}

export interface CourseMasterFaqInput {
  id?: number
  question: string
  answer: string
  display_order?: number
  is_active?: boolean
}

export interface CourseMasterFacultyInput {
  id?: number
  name: string
  role?: string
  bio?: string
  image_url?: string
  display_order?: number
}

export interface CourseMasterInput {
  parent_id?: number | null
  level_type: CourseMasterLevel
  title: string
  slug?: string
  short_description?: string
  detailed_description?: string
  image_url?: string
  brochure_url?: string
  syllabus_html?: string
  syllabus_pdf_url?: string
  demo_class_link?: string
  highlights?: string[]
  features?: string[]
  learning_outcomes?: string[]
  eligibility_criteria?: string[]
  duration?: string
  mode?: string
  price?: number
  discount_percent?: number
  discount_amount?: number
  coupon_code?: string
  coupon_enabled?: boolean
  installment_config?: unknown[]
  enrollment_validity_days?: number
  meta_title?: string
  meta_description?: string
  display_order?: number
  is_active?: boolean
  batches?: CourseMasterBatchInput[]
  faqs?: CourseMasterFaqInput[]
  faculty?: CourseMasterFacultyInput[]
}

export async function validateCourseMasterHierarchy(
  level_type: CourseMasterLevel,
  parent_id: number | null | undefined,
  excludeId?: number
): Promise<{ valid: boolean; error?: string; parentLevel?: CourseMasterLevel }> {
  const allowedParents = ALLOWED_PARENT_LEVELS[level_type] ?? []

  if (allowedParents.length === 0) {
    if (parent_id) {
      return { valid: false, error: `${level_type} cannot have a parent` }
    }
    return { valid: true }
  }

  if (!parent_id) {
    return { valid: false, error: `Parent is required for ${level_type}` }
  }

  const parentResult = await pool.query(
    'SELECT id, level_type FROM course_masters WHERE id = $1',
    [parent_id]
  )
  if (parentResult.rows.length === 0) {
    return { valid: false, error: 'Parent not found' }
  }

  const parentLevel = parentResult.rows[0].level_type as CourseMasterLevel
  if (!allowedParents.includes(parentLevel)) {
    return {
      valid: false,
      error: `Invalid parent. Expected ${allowedParents.join(' or ')}, got ${parentLevel}`,
    }
  }

  const allowedChildren = ALLOWED_CHILD_LEVELS[parentLevel] ?? []
  const normalizedLevel = level_type === 'leaf_course' ? 'course' : level_type
  if (!allowedChildren.includes(normalizedLevel) && !(level_type === 'leaf_course' && allowedChildren.includes('course'))) {
    return { valid: false, error: 'Parent cannot have this child type' }
  }

  if (excludeId && parent_id === excludeId) {
    return { valid: false, error: 'Cannot set self as parent' }
  }

  return { valid: true, parentLevel }
}

async function ensureUniqueSlug(slug: string, excludeId?: number): Promise<string> {
  let candidate = slug
  let counter = 1
  while (true) {
    const params: (string | number)[] = [candidate]
    let query = 'SELECT id FROM course_masters WHERE slug = $1'
    if (excludeId) {
      query += ' AND id != $2'
      params.push(excludeId)
    }
    const existing = await pool.query(query, params)
    if (existing.rows.length === 0) return candidate
    candidate = `${slug}-${counter++}`
  }
}

async function replaceBatches(courseMasterId: number, batches?: CourseMasterBatchInput[]) {
  await pool.query('DELETE FROM course_master_batches WHERE course_master_id = $1', [courseMasterId])
  if (!batches?.length) return
  for (let i = 0; i < batches.length; i++) {
    const b = batches[i]
    if (!b.start_date) continue
    await pool.query(
      `INSERT INTO course_master_batches (
         course_master_id, batch_name, batch_timing, schedule_days,
         start_date, end_date, enrollment_deadline, capacity,
         price, discount_percent, discount_amount, coupon_code,
         coupon_enabled, installment_config, notes, is_active, display_order
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        courseMasterId,
        b.batch_name || null,
        b.batch_timing || null,
        b.schedule_days || null,
        b.start_date,
        b.end_date || null,
        b.enrollment_deadline || null,
        b.capacity ?? null,
        b.price ?? null,
        b.discount_percent ?? null,
        b.discount_amount ?? null,
        b.coupon_code || null,
        b.coupon_enabled === true,
        jsonArray(b.installment_config),
        b.notes || null,
        b.is_active !== false,
        b.display_order ?? i,
      ]
    )
  }
}

async function replaceFaqs(courseMasterId: number, faqs?: CourseMasterFaqInput[]) {
  await pool.query('DELETE FROM course_master_faqs WHERE course_master_id = $1', [courseMasterId])
  if (!faqs?.length) return
  for (let i = 0; i < faqs.length; i++) {
    const f = faqs[i]
    if (!f.question?.trim()) continue
    await pool.query(
      `INSERT INTO course_master_faqs (course_master_id, question, answer, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      [courseMasterId, f.question, f.answer || '', f.display_order ?? i, f.is_active !== false]
    )
  }
}

async function replaceFaculty(courseMasterId: number, faculty?: CourseMasterFacultyInput[]) {
  await pool.query('DELETE FROM course_master_faculty WHERE course_master_id = $1', [courseMasterId])
  if (!faculty?.length) return
  for (let i = 0; i < faculty.length; i++) {
    const f = faculty[i]
    if (!f.name?.trim()) continue
    await pool.query(
      `INSERT INTO course_master_faculty (course_master_id, name, role, bio, image_url, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [courseMasterId, f.name, f.role || null, f.bio || null, f.image_url || null, f.display_order ?? i]
    )
  }
}

function jsonArray(value: unknown): string {
  return JSON.stringify(Array.isArray(value) ? value : [])
}

export async function getCourseMasterById(id: number) {
  const result = await pool.query('SELECT * FROM course_masters WHERE id = $1', [id])
  if (result.rows.length === 0) return null

  const [batches, faqs, faculty] = await Promise.all([
    pool.query(
      'SELECT * FROM course_master_batches WHERE course_master_id = $1 ORDER BY display_order, start_date',
      [id]
    ),
    pool.query(
      'SELECT * FROM course_master_faqs WHERE course_master_id = $1 ORDER BY display_order',
      [id]
    ),
    pool.query(
      'SELECT * FROM course_master_faculty WHERE course_master_id = $1 ORDER BY display_order',
      [id]
    ),
  ])

  return {
    ...result.rows[0],
    batches: batches.rows,
    faqs: faqs.rows,
    faculty: faculty.rows,
  }
}

export async function listCourseMasters() {
  const result = await pool.query(
    'SELECT * FROM course_masters ORDER BY display_order, title'
  )
  return result.rows
}

export async function createCourseMaster(input: CourseMasterInput) {
  const validation = await validateCourseMasterHierarchy(
    input.level_type,
    input.parent_id ?? null
  )
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  if (!input.title?.trim()) {
    throw new Error('Title is required')
  }

  const slug = await ensureUniqueSlug(slugify(input.slug || input.title))

  const result = await pool.query(
    `INSERT INTO course_masters (
      parent_id, level_type, title, slug, short_description, detailed_description,
      image_url, brochure_url, syllabus_html, syllabus_pdf_url, demo_class_link,
      highlights, features, learning_outcomes, eligibility_criteria,
      duration, mode, price, discount_percent, discount_amount,
      coupon_code, coupon_enabled, installment_config, enrollment_validity_days,
      meta_title, meta_description, display_order, is_active
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
    ) RETURNING *`,
    [
      input.parent_id ?? null,
      input.level_type,
      input.title.trim(),
      slug,
      input.short_description || null,
      isDetailLevel(input.level_type) ? input.detailed_description || null : null,
      input.image_url || null,
      isDetailLevel(input.level_type) ? input.brochure_url || null : null,
      isDetailLevel(input.level_type) ? input.syllabus_html || null : null,
      isDetailLevel(input.level_type) ? input.syllabus_pdf_url || null : null,
      isDetailLevel(input.level_type) ? input.demo_class_link || null : null,
      jsonArray(input.highlights),
      jsonArray(input.features),
      jsonArray(input.learning_outcomes),
      jsonArray(input.eligibility_criteria),
      isDetailLevel(input.level_type) ? input.duration || null : null,
      isDetailLevel(input.level_type) ? input.mode || null : null,
      isDetailLevel(input.level_type) ? input.price ?? null : null,
      isDetailLevel(input.level_type) ? input.discount_percent ?? null : null,
      isDetailLevel(input.level_type) ? input.discount_amount ?? null : null,
      isDetailLevel(input.level_type) ? input.coupon_code || null : null,
      isDetailLevel(input.level_type) ? input.coupon_enabled === true : false,
      jsonArray(input.installment_config),
      isDetailLevel(input.level_type) ? input.enrollment_validity_days ?? null : null,
      input.meta_title || null,
      input.meta_description || null,
      input.display_order ?? 0,
      input.is_active !== false,
    ]
  )

  const created = result.rows[0]
  if (isDetailLevel(input.level_type)) {
    await replaceBatches(created.id, input.batches)
    await replaceFaqs(created.id, input.faqs)
    await replaceFaculty(created.id, input.faculty)
  }

  return getCourseMasterById(created.id)
}

export async function updateCourseMaster(id: number, input: Partial<CourseMasterInput>) {
  const existing = await pool.query('SELECT * FROM course_masters WHERE id = $1', [id])
  if (existing.rows.length === 0) {
    throw new Error('Course master not found')
  }

  const current = existing.rows[0]
  const level_type = (input.level_type || current.level_type) as CourseMasterLevel
  const parent_id =
    input.parent_id !== undefined ? input.parent_id : current.parent_id

  const validation = await validateCourseMasterHierarchy(level_type, parent_id, id)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const title = input.title?.trim() || current.title
  const slug = await ensureUniqueSlug(
    slugify(input.slug || title),
    id
  )

  await pool.query(
    `UPDATE course_masters SET
      parent_id = $1, level_type = $2, title = $3, slug = $4,
      short_description = $5, detailed_description = $6,
      image_url = $7, brochure_url = $8, syllabus_html = $9, syllabus_pdf_url = $10,
      demo_class_link = $11, highlights = $12, features = $13, learning_outcomes = $14,
      eligibility_criteria = $15, duration = $16, mode = $17, price = $18,
      discount_percent = $19, discount_amount = $20, coupon_code = $21, coupon_enabled = $22,
      installment_config = $23, enrollment_validity_days = $24,
      meta_title = $25, meta_description = $26, display_order = $27, is_active = $28,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $29`,
    [
      parent_id ?? null,
      level_type,
      title,
      slug,
      input.short_description !== undefined ? input.short_description : current.short_description,
      input.detailed_description !== undefined
        ? input.detailed_description
        : current.detailed_description,
      input.image_url !== undefined ? input.image_url : current.image_url,
      input.brochure_url !== undefined ? input.brochure_url : current.brochure_url,
      input.syllabus_html !== undefined ? input.syllabus_html : current.syllabus_html,
      input.syllabus_pdf_url !== undefined ? input.syllabus_pdf_url : current.syllabus_pdf_url,
      input.demo_class_link !== undefined ? input.demo_class_link : current.demo_class_link,
      input.highlights !== undefined ? jsonArray(input.highlights) : current.highlights,
      input.features !== undefined ? jsonArray(input.features) : current.features,
      input.learning_outcomes !== undefined
        ? jsonArray(input.learning_outcomes)
        : current.learning_outcomes,
      input.eligibility_criteria !== undefined
        ? jsonArray(input.eligibility_criteria)
        : current.eligibility_criteria,
      input.duration !== undefined ? input.duration : current.duration,
      input.mode !== undefined ? input.mode : current.mode,
      input.price !== undefined ? input.price : current.price,
      input.discount_percent !== undefined ? input.discount_percent : current.discount_percent,
      input.discount_amount !== undefined ? input.discount_amount : current.discount_amount,
      input.coupon_code !== undefined ? input.coupon_code : current.coupon_code,
      input.coupon_enabled !== undefined ? input.coupon_enabled : current.coupon_enabled,
      input.installment_config !== undefined
        ? jsonArray(input.installment_config)
        : current.installment_config,
      input.enrollment_validity_days !== undefined
        ? input.enrollment_validity_days
        : current.enrollment_validity_days,
      input.meta_title !== undefined ? input.meta_title : current.meta_title,
      input.meta_description !== undefined ? input.meta_description : current.meta_description,
      input.display_order !== undefined ? input.display_order : current.display_order,
      input.is_active !== undefined ? input.is_active : current.is_active,
      id,
    ]
  )

  if (isDetailLevel(level_type)) {
    if (input.batches !== undefined) await replaceBatches(id, input.batches)
    if (input.faqs !== undefined) await replaceFaqs(id, input.faqs)
    if (input.faculty !== undefined) await replaceFaculty(id, input.faculty)
  }

  return getCourseMasterById(id)
}

export async function deleteCourseMaster(id: number) {
  const children = await pool.query(
    'SELECT COUNT(*)::int AS count FROM course_masters WHERE parent_id = $1',
    [id]
  )
  if (children.rows[0].count > 0) {
    throw new Error('Delete child items first before removing this node')
  }

  const result = await pool.query(
    'DELETE FROM course_masters WHERE id = $1 RETURNING id',
    [id]
  )
  return result.rows.length > 0
}
