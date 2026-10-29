import pool from '@/lib/db'
import {
  getCategoryExpenseSummaries,
  getEmployeeExpenseSummaries,
  getExpenseSummary,
} from '@/lib/expenses-db'
import type {
  CategoryExpenseSummary,
  EmployeeExpenseSummary,
  ExpenseSummary,
} from '@/lib/expenses-types'
import type {
  AttendanceReportRow,
  AttendanceReportSummary,
  AttendanceStatusRow,
  CenterPerformanceRow,
  CoursePerformanceRow,
  EnquiryCourseRow,
  EnquiryReportSummary,
  EnquiryRow,
  PaymentReportRow,
  PaymentReportSummary,
  ReportFilter,
  ReportType,
  StudentRegistrationRow,
  StudentRegistrationSummary,
  TrendPoint,
} from '@/lib/reports-types'

export type {
  AdminReportType,
  AttendanceReportRow,
  AttendanceReportSummary,
  AttendanceStatusRow,
  CenterPerformanceRow,
  CoursePerformanceRow,
  EnquiryCourseRow,
  EnquiryReportSummary,
  EnquiryRow,
  PaymentReportRow,
  PaymentReportSummary,
  ReportFilter,
  ReportType,
  StudentRegistrationRow,
  StudentRegistrationSummary,
  TrendPoint,
} from '@/lib/reports-types'
export {
  ADMIN_REPORT_TYPES,
  REPORT_TYPE_LABELS,
  REPORT_TYPES,
} from '@/lib/reports-types'

function pushDateRange(
  conditions: string[],
  params: unknown[],
  column: string,
  dateFrom?: string,
  dateTo?: string
) {
  if (dateFrom) {
    params.push(dateFrom)
    conditions.push(`${column} >= $${params.length}::date`)
  }
  if (dateTo) {
    params.push(dateTo)
    conditions.push(`${column} < ($${params.length}::date + INTERVAL '1 day')`)
  }
}

function escapeCsv(value: unknown): string {
  const str = value == null ? '' : String(value)
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function rowsToCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(','))
  }
  return lines.join('\n')
}

/* ------------------------------------------------------------------ expenses */

export async function getExpensesReport(filter: ReportFilter) {
  const summaryFilter = {
    centerId: filter.centerId,
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
    search: filter.search,
  }
  const [summary, byEmployee, byCategory] = await Promise.all([
    getExpenseSummary(summaryFilter),
    getEmployeeExpenseSummaries(summaryFilter),
    getCategoryExpenseSummaries(summaryFilter),
  ])

  const params: unknown[] = []
  const conditions: string[] = []
  if (filter.centerId != null) {
    params.push(filter.centerId)
    conditions.push(`x.center_id = $${params.length}`)
  }
  pushDateRange(conditions, params, 'x.expense_date', filter.dateFrom, filter.dateTo)
  if (filter.search) {
    params.push(`%${filter.search}%`)
    conditions.push(
      `(x.description ILIKE $${params.length} OR e.full_name ILIKE $${params.length} OR e.employee_code ILIKE $${params.length} OR x.notes ILIKE $${params.length})`
    )
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const trend = await pool.query(
    `SELECT DATE_FORMAT(x.expense_date, '%Y-%m-%d') AS date,
            COUNT(*)::int AS count,
            COALESCE(SUM(x.amount), 0)::float AS amount
     FROM expenses x
     JOIN employees e ON e.id = x.employee_id
     ${where}
     GROUP BY x.expense_date
     ORDER BY x.expense_date ASC
     LIMIT 366`,
    params
  )

  return {
    summary: summary as ExpenseSummary,
    byEmployee: byEmployee as EmployeeExpenseSummary[],
    byCategory: byCategory as CategoryExpenseSummary[],
    trend: trend.rows as TrendPoint[],
    rows: byCategory.map((row) => ({
      category: row.category,
      total_amount: row.total_amount,
      expense_count: row.expense_count,
    })),
  }
}

export async function getEmployeeExpensesReport(filter: ReportFilter) {
  const summaryFilter = {
    centerId: filter.centerId,
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
    search: filter.search,
  }
  const [summary, byEmployee] = await Promise.all([
    getExpenseSummary(summaryFilter),
    getEmployeeExpenseSummaries(summaryFilter),
  ])
  return {
    summary,
    rows: byEmployee,
  }
}

/* ------------------------------------------------------------------ enquiries */

export async function getEnquiriesReport(filter: ReportFilter) {
  const params: unknown[] = []
  const conditions: string[] = []

  if (filter.centerId != null) {
    params.push(filter.centerId)
    conditions.push(`cs.center_id = $${params.length}`)
  }
  pushDateRange(conditions, params, 'cs.created_at', filter.dateFrom, filter.dateTo)
  if (filter.search) {
    params.push(`%${filter.search}%`)
    conditions.push(
      `(cs.full_name ILIKE $${params.length} OR cs.email ILIKE $${params.length} OR cs.phone ILIKE $${params.length} OR cs.course_name ILIKE $${params.length} OR cs.message ILIKE $${params.length})`
    )
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const [summaryResult, byCourse, trend, countResult, listResult] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS total_count,
         COUNT(*) FILTER (WHERE cs.is_read)::int AS read_count,
         COUNT(*) FILTER (WHERE NOT cs.is_read)::int AS unread_count,
         COUNT(*) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM students s
             WHERE s.center_id = cs.center_id
               AND (
                 (cs.email IS NOT NULL AND cs.email <> '' AND lower(s.email) = lower(cs.email))
                 OR (cs.phone IS NOT NULL AND cs.phone <> '' AND s.mobile = cs.phone)
               )
           )
         )::int AS matched_student_count
       FROM contact_submissions cs
       ${where}`,
      params
    ),
    pool.query(
      `SELECT COALESCE(NULLIF(TRIM(cs.course_name), ''), '(unspecified)') AS course_name,
              COUNT(*)::int AS enquiry_count,
              COUNT(*) FILTER (WHERE cs.is_read)::int AS read_count
       FROM contact_submissions cs
       ${where}
       GROUP BY 1
       ORDER BY enquiry_count DESC
       LIMIT 50`,
      params
    ),
    pool.query(
      `SELECT DATE_FORMAT(cs.created_at::date, '%Y-%m-%d') AS date,
              COUNT(*)::int AS count
       FROM contact_submissions cs
       ${where}
       GROUP BY cs.created_at::date
       ORDER BY cs.created_at::date ASC
       LIMIT 366`,
      params
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM contact_submissions cs ${where}`, params),
    pool.query(
      `SELECT cs.id, cs.center_id, c.name AS center_name, cs.full_name, cs.email, cs.phone,
              cs.course_name, cs.message, cs.is_read, cs.created_at,
              EXISTS (
                SELECT 1 FROM students s
                WHERE s.center_id = cs.center_id
                  AND (
                    (cs.email IS NOT NULL AND cs.email <> '' AND lower(s.email) = lower(cs.email))
                    OR (cs.phone IS NOT NULL AND cs.phone <> '' AND s.mobile = cs.phone)
                  )
              ) AS matched_student
       FROM contact_submissions cs
       JOIN centers c ON c.id = cs.center_id
       ${where}
       ORDER BY cs.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filter.limit ?? 25, filter.offset ?? 0]
    ),
  ])

  const summary = (summaryResult.rows[0] || {
    total_count: 0,
    read_count: 0,
    unread_count: 0,
    matched_student_count: 0,
  }) as EnquiryReportSummary

  return {
    summary,
    byCourse: byCourse.rows as EnquiryCourseRow[],
    trend: trend.rows as TrendPoint[],
    rows: listResult.rows as EnquiryRow[],
    total: countResult.rows[0]?.total ?? 0,
    note: 'Matched students = enquiry email/phone matches a student account at the same center (not a formal conversion funnel).',
  }
}

/* ----------------------------------------------------- student registrations */

export async function getStudentRegistrationsReport(filter: ReportFilter) {
  const params: unknown[] = []
  const conditions: string[] = []

  if (filter.centerId != null) {
    params.push(filter.centerId)
    conditions.push(`s.center_id = $${params.length}`)
  }
  pushDateRange(conditions, params, 's.created_at', filter.dateFrom, filter.dateTo)
  if (filter.search) {
    params.push(`%${filter.search}%`)
    conditions.push(
      `(s.full_name ILIKE $${params.length} OR s.email ILIKE $${params.length} OR s.mobile ILIKE $${params.length} OR s.regno ILIKE $${params.length})`
    )
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const [summaryResult, trend, countResult, listResult] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS total_count,
         COUNT(*) FILTER (WHERE s.is_active)::int AS active_count,
         COUNT(*) FILTER (WHERE NOT s.is_active)::int AS inactive_count
       FROM students s
       ${where}`,
      params
    ),
    pool.query(
      `SELECT DATE_FORMAT(s.created_at::date, '%Y-%m-%d') AS date,
              COUNT(*)::int AS count
       FROM students s
       ${where}
       GROUP BY s.created_at::date
       ORDER BY s.created_at::date ASC
       LIMIT 366`,
      params
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM students s ${where}`, params),
    pool.query(
      `SELECT s.id, s.center_id, c.name AS center_name, s.regno, s.full_name, s.email,
              s.mobile, s.is_active, s.created_at
       FROM students s
       JOIN centers c ON c.id = s.center_id
       ${where}
       ORDER BY s.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filter.limit ?? 25, filter.offset ?? 0]
    ),
  ])

  return {
    summary: (summaryResult.rows[0] || {
      total_count: 0,
      active_count: 0,
      inactive_count: 0,
    }) as StudentRegistrationSummary,
    trend: trend.rows as TrendPoint[],
    rows: listResult.rows as StudentRegistrationRow[],
    total: countResult.rows[0]?.total ?? 0,
  }
}

/* ----------------------------------------------------------- payments / revenue */

export async function getPaymentsReport(filter: ReportFilter) {
  const params: unknown[] = []
  const conditions: string[] = []

  if (filter.centerId != null) {
    params.push(filter.centerId)
    conditions.push(`p.center_id = $${params.length}`)
  }
  pushDateRange(conditions, params, 'p.created_at', filter.dateFrom, filter.dateTo)
  if (filter.search) {
    params.push(`%${filter.search}%`)
    conditions.push(
      `(p.student_name ILIKE $${params.length} OR p.student_mobile ILIKE $${params.length} OR p.receipt_no ILIKE $${params.length} OR cm.title ILIKE $${params.length})`
    )
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const joinCourse = filter.search
    ? 'JOIN course_masters cm ON cm.id = p.course_master_id'
    : 'LEFT JOIN course_masters cm ON cm.id = p.course_master_id'

  const [summaryResult, trend, countResult, listResult] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS total_count,
         COUNT(*) FILTER (WHERE p.status = 'completed')::int AS completed_count,
         COALESCE(SUM(p.amount_paid) FILTER (WHERE p.status = 'completed'), 0)::float AS completed_revenue,
         COUNT(*) FILTER (WHERE p.status = 'pending')::int AS pending_count,
         COALESCE(SUM(p.amount_due) FILTER (WHERE p.status = 'pending'), 0)::float AS pending_amount,
         COUNT(*) FILTER (WHERE p.status = 'refunded')::int AS refunded_count,
         COALESCE(SUM(p.amount_paid) FILTER (WHERE p.status = 'refunded'), 0)::float AS refunded_amount
       FROM student_fee_payments p
       ${filter.search ? joinCourse : ''}
       ${where}`,
      params
    ),
    pool.query(
      `SELECT DATE_FORMAT(p.created_at::date, '%Y-%m-%d') AS date,
              COUNT(*)::int AS count,
              COALESCE(SUM(p.amount_paid) FILTER (WHERE p.status = 'completed'), 0)::float AS amount
       FROM student_fee_payments p
       ${filter.search ? joinCourse : ''}
       ${where}
       GROUP BY p.created_at::date
       ORDER BY p.created_at::date ASC
       LIMIT 366`,
      params
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM student_fee_payments p
       ${filter.search ? joinCourse : ''}
       ${where}`,
      params
    ),
    pool.query(
      `SELECT p.id, p.receipt_no, p.center_id, c.name AS center_name, p.course_master_id,
              cm.title AS course_title, p.student_name, p.student_mobile,
              p.amount_paid::float AS amount_paid, p.amount_due::float AS amount_due,
              p.status, p.payment_method, p.created_at
       FROM student_fee_payments p
       JOIN centers c ON c.id = p.center_id
       LEFT JOIN course_masters cm ON cm.id = p.course_master_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filter.limit ?? 25, filter.offset ?? 0]
    ),
  ])

  return {
    summary: (summaryResult.rows[0] || {
      total_count: 0,
      completed_count: 0,
      completed_revenue: 0,
      pending_count: 0,
      pending_amount: 0,
      refunded_count: 0,
      refunded_amount: 0,
    }) as PaymentReportSummary,
    trend: trend.rows as TrendPoint[],
    rows: listResult.rows as PaymentReportRow[],
    total: countResult.rows[0]?.total ?? 0,
  }
}

/* ---------------------------------------------------------- course performance */

export async function getCoursePerformanceReport(filter: ReportFilter) {
  const params: unknown[] = []
  const conditions: string[] = []

  if (filter.centerId != null) {
    params.push(filter.centerId)
    conditions.push(`p.center_id = $${params.length}`)
  }
  pushDateRange(conditions, params, 'p.created_at', filter.dateFrom, filter.dateTo)
  if (filter.search) {
    params.push(`%${filter.search}%`)
    conditions.push(`cm.title ILIKE $${params.length}`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const result = await pool.query(
    `SELECT
       p.course_master_id,
       cm.title AS course_title,
       COUNT(*)::int AS payment_count,
       COUNT(*) FILTER (WHERE p.status = 'completed')::int AS completed_count,
       COUNT(DISTINCT COALESCE(p.student_id::text, p.student_mobile, p.student_email, p.student_name))::int AS unique_students,
       COALESCE(SUM(p.amount_paid) FILTER (WHERE p.status = 'completed'), 0)::float AS revenue,
       COALESCE(SUM(p.discount_applied) FILTER (WHERE p.status = 'completed'), 0)::float AS discount_total
     FROM student_fee_payments p
     JOIN course_masters cm ON cm.id = p.course_master_id
     ${where}
     GROUP BY p.course_master_id, cm.title
     ORDER BY revenue DESC, payment_count DESC
     LIMIT 200`,
    params
  )

  const rows = result.rows as CoursePerformanceRow[]
  const summary = {
    course_count: rows.length,
    payment_count: rows.reduce((sum, r) => sum + Number(r.payment_count || 0), 0),
    completed_count: rows.reduce((sum, r) => sum + Number(r.completed_count || 0), 0),
    revenue: rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0),
    unique_students: rows.reduce((sum, r) => sum + Number(r.unique_students || 0), 0),
  }

  return { summary, rows }
}

/* ---------------------------------------------------------- center performance */

export async function getCenterPerformanceReport(filter: ReportFilter) {
  const params: unknown[] = []
  const studentDate: string[] = []
  const enquiryDate: string[] = []
  const paymentDate: string[] = []
  const expenseDate: string[] = []

  if (filter.centerId != null) {
    params.push(filter.centerId)
  }
  const centerClause = filter.centerId != null ? `AND c.id = $1` : ''

  let p = params.length
  if (filter.dateFrom) {
    p += 1
    params.push(filter.dateFrom)
    studentDate.push(`s.created_at >= $${p}::date`)
    enquiryDate.push(`cs.created_at >= $${p}::date`)
    paymentDate.push(`p.created_at >= $${p}::date`)
    expenseDate.push(`x.expense_date >= $${p}::date`)
  }
  if (filter.dateTo) {
    p += 1
    params.push(filter.dateTo)
    studentDate.push(`s.created_at < ($${p}::date + INTERVAL '1 day')`)
    enquiryDate.push(`cs.created_at < ($${p}::date + INTERVAL '1 day')`)
    paymentDate.push(`p.created_at < ($${p}::date + INTERVAL '1 day')`)
    expenseDate.push(`x.expense_date < ($${p}::date + INTERVAL '1 day')`)
  }

  let searchClause = ''
  if (filter.search) {
    p += 1
    params.push(`%${filter.search}%`)
    searchClause = `AND (c.name ILIKE $${p} OR c.slug ILIKE $${p})`
  }

  const and = (parts: string[]) => (parts.length ? `AND ${parts.join(' AND ')}` : '')

  const result = await pool.query(
    `SELECT
       c.id AS center_id,
       c.name AS center_name,
       c.slug AS center_slug,
       (
         SELECT COUNT(*)::int FROM students s
         WHERE s.center_id = c.id ${and(studentDate)}
       ) AS student_count,
       (
         SELECT COUNT(*)::int FROM contact_submissions cs
         WHERE cs.center_id = c.id ${and(enquiryDate)}
       ) AS enquiry_count,
       (
         SELECT COUNT(*)::int FROM student_fee_payments p
         WHERE p.center_id = c.id ${and(paymentDate)}
       ) AS payment_count,
       (
         SELECT COALESCE(SUM(p.amount_paid), 0)::float FROM student_fee_payments p
         WHERE p.center_id = c.id AND p.status = 'completed' ${and(paymentDate)}
       ) AS revenue,
       (
         SELECT COALESCE(SUM(x.amount), 0)::float FROM expenses x
         WHERE x.center_id = c.id ${and(expenseDate)}
       ) AS expense_total,
       (
         SELECT COUNT(*)::int FROM expenses x
         WHERE x.center_id = c.id ${and(expenseDate)}
       ) AS expense_count,
       (
         SELECT COUNT(*)::int FROM employees e
         WHERE e.center_id = c.id AND e.status = 'active'
       ) AS employee_count
     FROM centers c
     WHERE c.is_active = true ${centerClause} ${searchClause}
     ORDER BY revenue DESC NULLS LAST, student_count DESC
     LIMIT 100`,
    params
  )

  const rows = result.rows as CenterPerformanceRow[]
  const summary = {
    center_count: rows.length,
    student_count: rows.reduce((sum, r) => sum + Number(r.student_count || 0), 0),
    enquiry_count: rows.reduce((sum, r) => sum + Number(r.enquiry_count || 0), 0),
    payment_count: rows.reduce((sum, r) => sum + Number(r.payment_count || 0), 0),
    revenue: rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0),
    expense_total: rows.reduce((sum, r) => sum + Number(r.expense_total || 0), 0),
  }

  return { summary, rows }
}

/* ---------------------------------------------------------------- attendance */

export async function getAttendanceReport(filter: ReportFilter) {
  const params: unknown[] = []
  const conditions: string[] = []

  if (filter.centerId != null) {
    params.push(filter.centerId)
    conditions.push(`a.center_id = $${params.length}`)
  }
  pushDateRange(conditions, params, 'a.attendance_date', filter.dateFrom, filter.dateTo)
  if (filter.search) {
    params.push(`%${filter.search}%`)
    conditions.push(
      `(s.full_name ILIKE $${params.length} OR s.mobile ILIKE $${params.length} OR s.regno ILIKE $${params.length} OR b.name ILIKE $${params.length} OR b.code ILIKE $${params.length} OR cm.title ILIKE $${params.length})`
    )
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const fromJoins = `
    FROM attendance_records a
    JOIN students s ON s.id = a.student_id
    JOIN course_batches b ON b.id = a.batch_id
    JOIN course_masters cm ON cm.id = b.course_master_id
    JOIN centers c ON c.id = a.center_id
    LEFT JOIN employees e ON e.id = a.marked_by_employee_id
  `

  const [summaryResult, byStatus, trend, countResult, listResult] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS total_count,
         COUNT(*) FILTER (WHERE a.status = 'present')::int AS present_count,
         COUNT(*) FILTER (WHERE a.status = 'absent')::int AS absent_count,
         COUNT(*) FILTER (WHERE a.status = 'late')::int AS late_count,
         COUNT(*) FILTER (WHERE a.status = 'excused')::int AS excused_count
       ${fromJoins}
       ${where}`,
      params
    ),
    pool.query(
      `SELECT a.status, COUNT(*)::int AS count
       ${fromJoins}
       ${where}
       GROUP BY a.status
       ORDER BY count DESC`,
      params
    ),
    pool.query(
      `SELECT DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS date,
              COUNT(*)::int AS count,
              COUNT(*) FILTER (WHERE a.status IN ('present', 'late', 'excused'))::int AS present_count
       ${fromJoins}
       ${where}
       GROUP BY a.attendance_date
       ORDER BY a.attendance_date ASC
       LIMIT 366`,
      params
    ),
    pool.query(`SELECT COUNT(*)::int AS total ${fromJoins} ${where}`, params),
    pool.query(
      `SELECT a.id, a.center_id, c.name AS center_name,
              a.attendance_date::text AS attendance_date,
              a.batch_id, b.name AS batch_name, b.code AS batch_code,
              cm.title AS course_title,
              a.student_id, s.full_name AS student_name, s.regno AS student_regno,
              a.status, a.notes, e.full_name AS marked_by_name
       ${fromJoins}
       ${where}
       ORDER BY a.attendance_date DESC, b.name ASC, s.full_name ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filter.limit ?? 25, filter.offset ?? 0]
    ),
  ])

  const raw = summaryResult.rows[0] || {
    total_count: 0,
    present_count: 0,
    absent_count: 0,
    late_count: 0,
    excused_count: 0,
  }
  const total = Number(raw.total_count || 0)
  const attended =
    Number(raw.present_count || 0) + Number(raw.late_count || 0) + Number(raw.excused_count || 0)
  const summary: AttendanceReportSummary = {
    total_count: total,
    present_count: Number(raw.present_count || 0),
    absent_count: Number(raw.absent_count || 0),
    late_count: Number(raw.late_count || 0),
    excused_count: Number(raw.excused_count || 0),
    attendance_rate: total > 0 ? Math.round((attended / total) * 1000) / 10 : null,
  }

  return {
    summary,
    byStatus: byStatus.rows as AttendanceStatusRow[],
    trend: (trend.rows as Array<{ date: string; count: number; present_count: number }>).map(
      (row) => ({
        date: row.date,
        count: row.count,
      })
    ) as TrendPoint[],
    rows: listResult.rows as AttendanceReportRow[],
    total: countResult.rows[0]?.total ?? 0,
  }
}

/* ---------------------------------------------------------------- CSV helpers */

export function reportToCsv(type: ReportType, payload: Record<string, unknown>): string {
  switch (type) {
    case 'expenses': {
      const rows = (payload.byCategory || payload.rows || []) as Array<Record<string, unknown>>
      return rowsToCsv(['category', 'total_amount', 'expense_count'], rows)
    }
    case 'employee_expenses': {
      const rows = (payload.rows || []) as Array<Record<string, unknown>>
      return rowsToCsv(
        [
          'employee_id',
          'employee_name',
          'employee_code',
          'total_amount',
          'approved_amount',
          'pending_amount',
          'rejected_amount',
          'expense_count',
        ],
        rows
      )
    }
    case 'enquiries': {
      const rows = (payload.rows || []) as Array<Record<string, unknown>>
      return rowsToCsv(
        [
          'id',
          'center_id',
          'center_name',
          'full_name',
          'email',
          'phone',
          'course_name',
          'is_read',
          'matched_student',
          'created_at',
        ],
        rows
      )
    }
    case 'student_registrations': {
      const rows = (payload.rows || []) as Array<Record<string, unknown>>
      return rowsToCsv(
        [
          'id',
          'center_id',
          'center_name',
          'regno',
          'full_name',
          'email',
          'mobile',
          'is_active',
          'created_at',
        ],
        rows
      )
    }
    case 'payments': {
      const rows = (payload.rows || []) as Array<Record<string, unknown>>
      return rowsToCsv(
        [
          'id',
          'receipt_no',
          'center_id',
          'center_name',
          'course_title',
          'student_name',
          'student_mobile',
          'amount_paid',
          'amount_due',
          'status',
          'payment_method',
          'created_at',
        ],
        rows
      )
    }
    case 'course_performance': {
      const rows = (payload.rows || []) as Array<Record<string, unknown>>
      return rowsToCsv(
        [
          'course_master_id',
          'course_title',
          'payment_count',
          'completed_count',
          'unique_students',
          'revenue',
          'discount_total',
        ],
        rows
      )
    }
    case 'center_performance': {
      const rows = (payload.rows || []) as Array<Record<string, unknown>>
      return rowsToCsv(
        [
          'center_id',
          'center_name',
          'center_slug',
          'student_count',
          'enquiry_count',
          'payment_count',
          'revenue',
          'expense_total',
          'expense_count',
          'employee_count',
        ],
        rows
      )
    }
    case 'attendance': {
      const rows = (payload.rows || []) as Array<Record<string, unknown>>
      return rowsToCsv(
        [
          'id',
          'center_id',
          'center_name',
          'attendance_date',
          'batch_name',
          'batch_code',
          'course_title',
          'student_name',
          'student_regno',
          'status',
          'notes',
          'marked_by_name',
        ],
        rows
      )
    }
    default:
      return rowsToCsv(['message'], [{ message: 'Unsupported report type' }])
  }
}

export async function runReport(type: ReportType, filter: ReportFilter) {
  const listFilter = {
    ...filter,
    limit: filter.limit ?? 25,
    offset: filter.offset ?? 0,
  }

  switch (type) {
    case 'expenses':
      return getExpensesReport(filter)
    case 'employee_expenses':
      return getEmployeeExpensesReport(filter)
    case 'enquiries':
      return getEnquiriesReport(listFilter)
    case 'student_registrations':
      return getStudentRegistrationsReport(listFilter)
    case 'payments':
      return getPaymentsReport(listFilter)
    case 'course_performance':
      return getCoursePerformanceReport(filter)
    case 'center_performance':
      return getCenterPerformanceReport(filter)
    case 'attendance':
      return getAttendanceReport(listFilter)
    default:
      throw new Error(`Unsupported report type: ${type}`)
  }
}
