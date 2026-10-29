import pool from '@/lib/db'
import { getBatchById } from '@/lib/course-batches-db'
import type { CourseBatchRow } from '@/lib/course-batches-types'
import type {
  AttendanceDaySummary,
  AttendanceRecordRow,
  AttendanceRosterEntry,
  AttendanceStatus,
  StudentAttendanceSummary,
} from '@/lib/attendance-types'

export type {
  AttendanceDaySummary,
  AttendanceRecordRow,
  AttendanceRosterEntry,
  AttendanceStatus,
  StudentAttendanceSummary,
} from '@/lib/attendance-types'
export { ATTENDANCE_STATUSES } from '@/lib/attendance-types'

export const ATTENDANCE_SELECT = `
  a.id, a.center_id, a.batch_id, a.student_id, a.attendance_date, a.status,
  a.marked_by_employee_id, a.notes, a.created_at, a.updated_at
`

export async function getAttendanceRoster(
  batchId: number,
  centerId: number,
  attendanceDate: string
): Promise<{ batch: CourseBatchRow; roster: AttendanceRosterEntry[] } | null> {
  const batch = await getBatchById(batchId, centerId)
  if (!batch) return null

  const result = await pool.query(
    `SELECT s.id AS student_id, s.full_name AS student_name, s.mobile AS student_mobile,
            s.regno AS student_regno, en.status AS enrollment_status,
            a.id AS attendance_id, a.status, a.notes
     FROM course_batch_enrollments en
     JOIN students s ON s.id = en.student_id
     LEFT JOIN attendance_records a
       ON a.batch_id = en.batch_id
      AND a.student_id = en.student_id
      AND a.attendance_date = $2::date
     WHERE en.batch_id = $1 AND en.status = 'active'
     ORDER BY s.full_name ASC`,
    [batchId, attendanceDate]
  )

  return { batch, roster: result.rows }
}

export async function saveAttendanceRoster(input: {
  centerId: number
  batchId: number
  attendanceDate: string
  markedByEmployeeId?: number | null
  entries: Array<{ studentId: number; status: AttendanceStatus; notes?: string | null }>
}): Promise<number> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const enrolled = await client.query(
      `SELECT student_id FROM course_batch_enrollments
       WHERE batch_id = $1 AND status = 'active'`,
      [input.batchId]
    )
    const allowed = new Set(enrolled.rows.map((r: { student_id: number }) => r.student_id))

    let saved = 0
    for (const entry of input.entries) {
      if (!allowed.has(entry.studentId)) continue
      await client.query(
        `INSERT INTO attendance_records (
           center_id, batch_id, student_id, attendance_date, status,
           marked_by_employee_id, notes
         ) VALUES ($1, $2, $3, $4::date, $5, $6, $7)
         ON CONFLICT (batch_id, student_id, attendance_date) DO UPDATE SET
           status = EXCLUDED.status,
           marked_by_employee_id = COALESCE(EXCLUDED.marked_by_employee_id, attendance_records.marked_by_employee_id),
           notes = EXCLUDED.notes,
           updated_at = CURRENT_TIMESTAMP`,
        [
          input.centerId,
          input.batchId,
          entry.studentId,
          input.attendanceDate,
          entry.status,
          input.markedByEmployeeId ?? null,
          entry.notes?.trim() || null,
        ]
      )
      saved++
    }

    await client.query('COMMIT')
    return saved
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function listAttendanceHistory(filters: {
  centerId?: number
  batchId?: number
  dateFrom?: string
  dateTo?: string
  status?: AttendanceStatus
  search?: string
  limit: number
  offset: number
}): Promise<{ rows: AttendanceRecordRow[]; total: number; days: AttendanceDaySummary[] }> {
  const params: unknown[] = []
  const conditions: string[] = []

  if (filters.centerId != null) {
    params.push(filters.centerId)
    conditions.push(`a.center_id = $${params.length}`)
  }
  if (filters.batchId) {
    params.push(filters.batchId)
    conditions.push(`a.batch_id = $${params.length}`)
  }
  if (filters.dateFrom) {
    params.push(filters.dateFrom)
    conditions.push(`a.attendance_date >= $${params.length}::date`)
  }
  if (filters.dateTo) {
    params.push(filters.dateTo)
    conditions.push(`a.attendance_date <= $${params.length}::date`)
  }
  if (filters.status) {
    params.push(filters.status)
    conditions.push(`a.status = $${params.length}`)
  }
  if (filters.search) {
    params.push(`%${filters.search}%`)
    conditions.push(
      `(s.full_name ILIKE $${params.length} OR s.mobile ILIKE $${params.length} OR s.regno ILIKE $${params.length} OR b.name ILIKE $${params.length} OR b.code ILIKE $${params.length})`
    )
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM attendance_records a
     JOIN students s ON s.id = a.student_id
     JOIN course_batches b ON b.id = a.batch_id
     ${where}`,
    params
  )
  const total = countResult.rows[0]?.total ?? 0

  const result = await pool.query(
    `SELECT ${ATTENDANCE_SELECT},
            s.full_name AS student_name, s.mobile AS student_mobile, s.regno AS student_regno,
            b.name AS batch_name, b.code AS batch_code,
            cm.title AS course_title,
            c.name AS center_name,
            e.full_name AS marked_by_name
     FROM attendance_records a
     JOIN students s ON s.id = a.student_id
     JOIN course_batches b ON b.id = a.batch_id
     JOIN course_masters cm ON cm.id = b.course_master_id
     JOIN centers c ON c.id = a.center_id
     LEFT JOIN employees e ON e.id = a.marked_by_employee_id
     ${where}
     ORDER BY a.attendance_date DESC, b.name ASC, s.full_name ASC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, filters.limit, filters.offset]
  )

  const daysResult = await pool.query(
    `SELECT a.attendance_date::text AS attendance_date, a.batch_id, b.name AS batch_name,
            a.center_id, c.name AS center_name,
            COUNT(*) FILTER (WHERE a.status = 'present')::int AS present_count,
            COUNT(*) FILTER (WHERE a.status = 'absent')::int AS absent_count,
            COUNT(*) FILTER (WHERE a.status = 'late')::int AS late_count,
            COUNT(*) FILTER (WHERE a.status = 'excused')::int AS excused_count,
            COUNT(*)::int AS total_marked
     FROM attendance_records a
     JOIN course_batches b ON b.id = a.batch_id
     JOIN students s ON s.id = a.student_id
     JOIN centers c ON c.id = a.center_id
     ${where}
     GROUP BY a.attendance_date, a.batch_id, b.name, a.center_id, c.name
     ORDER BY a.attendance_date DESC, b.name ASC
     LIMIT 50`,
    params
  )

  return { rows: result.rows, total, days: daysResult.rows }
}

export async function deleteAttendanceForDay(
  centerId: number,
  batchId: number,
  attendanceDate: string
): Promise<number> {
  const result = await pool.query(
    `DELETE FROM attendance_records
     WHERE center_id = $1 AND batch_id = $2 AND attendance_date = $3::date`,
    [centerId, batchId, attendanceDate]
  )
  return result.rowCount || 0
}

export async function getStudentAttendanceSummary(
  studentId: number,
  centerId: number
): Promise<{
  overall: {
    present_count: number
    absent_count: number
    late_count: number
    excused_count: number
    total_marked: number
    attendance_rate: number | null
  }
  byBatch: StudentAttendanceSummary[]
}> {
  const overallResult = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'present')::int AS present_count,
       COUNT(*) FILTER (WHERE status = 'absent')::int AS absent_count,
       COUNT(*) FILTER (WHERE status = 'late')::int AS late_count,
       COUNT(*) FILTER (WHERE status = 'excused')::int AS excused_count,
       COUNT(*)::int AS total_marked
     FROM attendance_records
     WHERE student_id = $1 AND center_id = $2`,
    [studentId, centerId]
  )
  const overall = overallResult.rows[0] || {
    present_count: 0,
    absent_count: 0,
    late_count: 0,
    excused_count: 0,
    total_marked: 0,
  }
  const attended =
    Number(overall.present_count) + Number(overall.late_count) + Number(overall.excused_count)
  const attendance_rate =
    overall.total_marked > 0 ? Math.round((attended / overall.total_marked) * 1000) / 10 : null

  const batchesResult = await pool.query(
    `SELECT b.id AS batch_id, b.name AS batch_name, b.code AS batch_code, cm.title AS course_title,
            COUNT(*) FILTER (WHERE a.status = 'present')::int AS present_count,
            COUNT(*) FILTER (WHERE a.status = 'absent')::int AS absent_count,
            COUNT(*) FILTER (WHERE a.status = 'late')::int AS late_count,
            COUNT(*) FILTER (WHERE a.status = 'excused')::int AS excused_count,
            COUNT(*)::int AS total_marked
     FROM attendance_records a
     JOIN course_batches b ON b.id = a.batch_id
     JOIN course_masters cm ON cm.id = b.course_master_id
     WHERE a.student_id = $1 AND a.center_id = $2
     GROUP BY b.id, b.name, b.code, cm.title
     ORDER BY b.name ASC`,
    [studentId, centerId]
  )

  const byBatch: StudentAttendanceSummary[] = []
  for (const row of batchesResult.rows) {
    const batchAttended =
      Number(row.present_count) + Number(row.late_count) + Number(row.excused_count)
    const rate =
      row.total_marked > 0 ? Math.round((batchAttended / row.total_marked) * 1000) / 10 : null

    const recentResult = await pool.query(
      `SELECT attendance_date::text AS attendance_date, status, notes
       FROM attendance_records
       WHERE student_id = $1 AND batch_id = $2
       ORDER BY attendance_date DESC
       LIMIT 10`,
      [studentId, row.batch_id]
    )

    byBatch.push({
      batch_id: row.batch_id,
      batch_name: row.batch_name,
      batch_code: row.batch_code,
      course_title: row.course_title,
      present_count: row.present_count,
      absent_count: row.absent_count,
      late_count: row.late_count,
      excused_count: row.excused_count,
      total_marked: row.total_marked,
      attendance_rate: rate,
      recent: recentResult.rows,
    })
  }

  return {
    overall: { ...overall, attendance_rate },
    byBatch,
  }
}
