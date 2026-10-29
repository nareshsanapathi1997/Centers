import pool from './db'

export interface CourseMaterialRow {
  id: number
  center_id: number
  course_master_id: number
  title: string
  description: string | null
  file_url: string
  file_type: string
  file_size_bytes: number | null
  sort_order: number
  is_active: boolean
  created_at: string
  course_title?: string
}

export async function listCourseMaterials(
  centerId: number,
  courseMasterId?: number
): Promise<CourseMaterialRow[]> {
  const params: unknown[] = [centerId]
  let where = 'WHERE m.center_id = $1'
  if (courseMasterId) {
    params.push(courseMasterId)
    where += ` AND m.course_master_id = $2`
  }

  const result = await pool.query(
    `SELECT m.*, cm.title AS course_title
     FROM student_course_materials m
     LEFT JOIN course_masters cm ON cm.id = m.course_master_id
     ${where}
     ORDER BY m.sort_order ASC, m.created_at DESC`,
    params
  )
  return result.rows
}

export async function getStudentMaterials(studentId: number, centerId: number) {
  const result = await pool.query(
    `SELECT m.*, cm.title AS course_title
     FROM student_course_materials m
     JOIN course_masters cm ON cm.id = m.course_master_id
     WHERE m.center_id = $1 AND m.is_active = true
       AND m.course_master_id IN (
         SELECT DISTINCT sfp.course_master_id
         FROM student_fee_payments sfp
         WHERE sfp.center_id = $1 AND sfp.status = 'completed'
           AND (sfp.student_id = $2 OR (
             sfp.student_id IS NULL AND sfp.student_mobile = (SELECT mobile FROM students WHERE id = $2)
           ))
       )
     ORDER BY cm.title ASC, m.sort_order ASC, m.created_at DESC`,
    [centerId, studentId]
  )
  return result.rows
}

export async function getEnrolledStudentIdsForCourse(
  centerId: number,
  courseMasterId: number
): Promise<number[]> {
  const result = await pool.query(
    `SELECT DISTINCT s.id
     FROM students s
     JOIN student_fee_payments sfp ON sfp.center_id = s.center_id
       AND (sfp.student_id = s.id OR sfp.student_mobile = s.mobile)
     WHERE s.center_id = $1 AND sfp.course_master_id = $2 AND sfp.status = 'completed' AND s.is_active = true`,
    [centerId, courseMasterId]
  )
  return result.rows.map((r) => r.id)
}
