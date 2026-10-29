import pool from '@/lib/db'
import type {
  BatchEnrollmentRow,
  BatchStatus,
  CourseBatchRow,
  CourseOption,
  EnrollmentStatus,
  PricingBatchOption,
} from '@/lib/course-batches-types'

export type {
  BatchEnrollmentRow,
  BatchStatus,
  CourseBatchRow,
  CourseOption,
  EnrollmentStatus,
  PricingBatchOption,
} from '@/lib/course-batches-types'
export { BATCH_STATUSES, ENROLLMENT_STATUSES } from '@/lib/course-batches-types'

export const BATCH_SELECT = `
  b.id, b.center_id, b.course_master_id, b.name, b.code,
  b.start_date, b.end_date, b.status, b.capacity, b.faculty_employee_id,
  b.course_master_batch_id, b.notes, b.created_at, b.updated_at
`

export async function generateBatchCode(centerId: number): Promise<string> {
  const year = new Date().getFullYear()
  const result = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM course_batches WHERE center_id = $1 AND code LIKE $2`,
    [centerId, `BAT${year}%`]
  )
  const seq = (result.rows[0]?.cnt || 0) + 1
  return `BAT${year}${String(seq).padStart(4, '0')}`
}

export async function listCoursesForCenterBatches(centerId: number): Promise<CourseOption[]> {
  const result = await pool.query(
    `SELECT cm.id, cm.title, cm.slug
     FROM course_center_assignments cca
     JOIN course_masters cm ON cm.id = cca.course_master_id
     WHERE cca.center_id = $1 AND COALESCE(cm.is_active, true) = true
     ORDER BY cm.title ASC`,
    [centerId]
  )
  return result.rows
}

export async function getBatchById(
  id: number,
  centerId?: number
): Promise<CourseBatchRow | null> {
  const params: unknown[] = [id]
  let where = 'WHERE b.id = $1'
  if (centerId != null) {
    params.push(centerId)
    where += ` AND b.center_id = $${params.length}`
  }

  const result = await pool.query(
    `SELECT ${BATCH_SELECT},
            cm.title AS course_title, cm.slug AS course_slug,
            e.full_name AS faculty_name, e.employee_code AS faculty_code,
            cmb.batch_name AS pricing_batch_name,
            cmb.batch_timing AS pricing_batch_timing,
            c.name AS center_name, c.slug AS center_slug,
            (
              SELECT COUNT(*)::int FROM course_batch_enrollments en
              WHERE en.batch_id = b.id AND en.status = 'active'
            ) AS enrolled_count
     FROM course_batches b
     JOIN centers c ON c.id = b.center_id
     JOIN course_masters cm ON cm.id = b.course_master_id
     LEFT JOIN employees e ON e.id = b.faculty_employee_id
     LEFT JOIN course_master_batches cmb ON cmb.id = b.course_master_batch_id
     ${where}`,
    params
  )
  return result.rows[0] || null
}

export type BatchWriteInput = {
  centerId: number
  courseMasterId: number
  name: string
  code?: string | null
  startDate?: string | null
  endDate?: string | null
  status?: BatchStatus
  capacity?: number | null
  facultyEmployeeId?: number | null
  courseMasterBatchId?: number | null
  notes?: string | null
}

export async function createBatch(input: BatchWriteInput): Promise<CourseBatchRow> {
  const code = input.code?.trim() || (await generateBatchCode(input.centerId))
  const result = await pool.query(
    `INSERT INTO course_batches (
       center_id, course_master_id, name, code, start_date, end_date,
       status, capacity, faculty_employee_id, course_master_batch_id, notes
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      input.centerId,
      input.courseMasterId,
      input.name.trim(),
      code,
      input.startDate || null,
      input.endDate || null,
      input.status || 'upcoming',
      input.capacity ?? null,
      input.facultyEmployeeId ?? null,
      input.courseMasterBatchId ?? null,
      input.notes?.trim() || null,
    ]
  )
  const created = await getBatchById(result.rows[0].id, input.centerId)
  if (!created) throw new Error('Failed to load created batch')
  return created
}

export async function updateBatch(
  id: number,
  centerId: number,
  input: Partial<BatchWriteInput>
): Promise<CourseBatchRow | null> {
  const existing = await getBatchById(id, centerId)
  if (!existing) return null

  const result = await pool.query(
    `UPDATE course_batches SET
       course_master_id = $1,
       name = $2,
       code = $3,
       start_date = $4,
       end_date = $5,
       status = $6,
       capacity = $7,
       faculty_employee_id = $8,
       course_master_batch_id = $9,
       notes = $10,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $11 AND center_id = $12
     RETURNING id`,
    [
      input.courseMasterId !== undefined ? input.courseMasterId : existing.course_master_id,
      input.name !== undefined ? input.name.trim() : existing.name,
      input.code !== undefined
        ? input.code?.trim() || existing.code
        : existing.code,
      input.startDate !== undefined ? input.startDate : existing.start_date,
      input.endDate !== undefined ? input.endDate : existing.end_date,
      input.status !== undefined ? input.status : existing.status,
      input.capacity !== undefined ? input.capacity : existing.capacity,
      input.facultyEmployeeId !== undefined
        ? input.facultyEmployeeId
        : existing.faculty_employee_id,
      input.courseMasterBatchId !== undefined
        ? input.courseMasterBatchId
        : existing.course_master_batch_id,
      input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
      id,
      centerId,
    ]
  )
  if (!result.rows[0]) return null
  return getBatchById(id, centerId)
}

export async function deleteBatch(id: number, centerId?: number): Promise<boolean> {
  const params: unknown[] = [id]
  let sql = 'DELETE FROM course_batches WHERE id = $1'
  if (centerId != null) {
    params.push(centerId)
    sql += ` AND center_id = $${params.length}`
  }
  const result = await pool.query(sql, params)
  return (result.rowCount || 0) > 0
}

export async function assertCourseAssignable(
  courseMasterId: number,
  centerId: number
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM course_center_assignments
     WHERE course_master_id = $1 AND center_id = $2
     LIMIT 1`,
    [courseMasterId, centerId]
  )
  return result.rows.length > 0
}

export async function assertEmployeeInCenter(
  employeeId: number,
  centerId: number
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM employees WHERE id = $1 AND center_id = $2 LIMIT 1`,
    [employeeId, centerId]
  )
  return result.rows.length > 0
}

export async function assertPricingBatchForCourse(
  courseMasterBatchId: number,
  courseMasterId: number
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM course_master_batches
     WHERE id = $1 AND course_master_id = $2
     LIMIT 1`,
    [courseMasterBatchId, courseMasterId]
  )
  return result.rows.length > 0
}

export async function listPricingBatchesForCourse(
  courseMasterId: number
): Promise<PricingBatchOption[]> {
  const result = await pool.query(
    `SELECT id, course_master_id, batch_name, batch_timing, COALESCE(is_active, true) AS is_active
     FROM course_master_batches
     WHERE course_master_id = $1
     ORDER BY display_order ASC NULLS LAST, batch_name ASC`,
    [courseMasterId]
  )
  return result.rows
}

export async function listPricingBatchesForCenter(
  centerId: number
): Promise<PricingBatchOption[]> {
  const result = await pool.query(
    `SELECT cmb.id, cmb.course_master_id, cmb.batch_name, cmb.batch_timing,
            COALESCE(cmb.is_active, true) AS is_active
     FROM course_master_batches cmb
     JOIN course_center_assignments cca ON cca.course_master_id = cmb.course_master_id
     WHERE cca.center_id = $1
     ORDER BY cmb.course_master_id ASC, cmb.display_order ASC NULLS LAST, cmb.batch_name ASC`,
    [centerId]
  )
  return result.rows
}

export async function listBatchEnrollments(batchId: number): Promise<BatchEnrollmentRow[]> {
  const result = await pool.query(
    `SELECT en.id, en.batch_id, en.student_id, en.status, en.enrolled_at, en.notes,
            s.full_name AS student_name, s.mobile AS student_mobile,
            s.email AS student_email, s.regno AS student_regno,
            s.is_active AS student_active
     FROM course_batch_enrollments en
     JOIN students s ON s.id = en.student_id
     WHERE en.batch_id = $1
     ORDER BY en.enrolled_at DESC, s.full_name ASC`,
    [batchId]
  )
  return result.rows
}

export async function countActiveEnrollments(batchId: number): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM course_batch_enrollments
     WHERE batch_id = $1 AND status = 'active'`,
    [batchId]
  )
  return result.rows[0]?.cnt ?? 0
}

export async function enrollStudent(input: {
  batchId: number
  studentId: number
  notes?: string | null
}): Promise<BatchEnrollmentRow> {
  const result = await pool.query(
    `INSERT INTO course_batch_enrollments (batch_id, student_id, status, notes)
     VALUES ($1, $2, 'active', $3)
     ON CONFLICT (batch_id, student_id) DO UPDATE SET
       status = 'active',
       notes = COALESCE(EXCLUDED.notes, course_batch_enrollments.notes),
       enrolled_at = CASE
         WHEN course_batch_enrollments.status = 'active' THEN course_batch_enrollments.enrolled_at
         ELSE CURRENT_TIMESTAMP
       END
     RETURNING id, batch_id, student_id, status, enrolled_at, notes`,
    [input.batchId, input.studentId, input.notes?.trim() || null]
  )
  const row = result.rows[0]
  const enriched = await pool.query(
    `SELECT en.id, en.batch_id, en.student_id, en.status, en.enrolled_at, en.notes,
            s.full_name AS student_name, s.mobile AS student_mobile,
            s.email AS student_email, s.regno AS student_regno,
            s.is_active AS student_active
     FROM course_batch_enrollments en
     JOIN students s ON s.id = en.student_id
     WHERE en.id = $1`,
    [row.id]
  )
  return enriched.rows[0]
}

export async function removeEnrollment(
  batchId: number,
  studentId: number,
  hardDelete = false
): Promise<boolean> {
  if (hardDelete) {
    const result = await pool.query(
      `DELETE FROM course_batch_enrollments WHERE batch_id = $1 AND student_id = $2`,
      [batchId, studentId]
    )
    return (result.rowCount || 0) > 0
  }
  const result = await pool.query(
    `UPDATE course_batch_enrollments SET status = 'withdrawn'
     WHERE batch_id = $1 AND student_id = $2 AND status = 'active'`,
    [batchId, studentId]
  )
  return (result.rowCount || 0) > 0
}

export async function assertStudentInCenter(
  studentId: number,
  centerId: number
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM students WHERE id = $1 AND center_id = $2 LIMIT 1`,
    [studentId, centerId]
  )
  return result.rows.length > 0
}

export async function listStudentBatches(
  studentId: number,
  centerId: number
): Promise<CourseBatchRow[]> {
  const result = await pool.query(
    `SELECT ${BATCH_SELECT},
            cm.title AS course_title, cm.slug AS course_slug,
            e.full_name AS faculty_name, e.employee_code AS faculty_code,
            c.name AS center_name, c.slug AS center_slug,
            en.status AS enrollment_status,
            en.enrolled_at
     FROM course_batch_enrollments en
     JOIN course_batches b ON b.id = en.batch_id
     JOIN centers c ON c.id = b.center_id
     JOIN course_masters cm ON cm.id = b.course_master_id
     LEFT JOIN employees e ON e.id = b.faculty_employee_id
     WHERE en.student_id = $1 AND b.center_id = $2 AND en.status = 'active'
     ORDER BY b.start_date DESC NULLS LAST, b.name ASC`,
    [studentId, centerId]
  )
  return result.rows
}

export function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
  )
}

export function uniqueViolationMessage(error: unknown): string {
  const detail =
    error && typeof error === 'object' && 'detail' in error
      ? String((error as { detail?: string }).detail || '')
      : ''
  if (/code/i.test(detail)) return 'Batch code already exists for this center'
  if (/batch_id.*student_id|student_id.*batch_id/i.test(detail)) {
    return 'Student is already enrolled in this batch'
  }
  return 'A conflicting batch record already exists'
}
