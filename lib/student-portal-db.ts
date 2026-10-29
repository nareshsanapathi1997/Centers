import pool from './db'

export interface StudentRow {
  id: number
  center_id: number
  regno: string | null
  full_name: string
  email: string | null
  mobile: string
  father_name: string | null
  address: string | null
  state: string | null
  city: string | null
  pincode: string | null
  date_of_birth: string | null
  photo_url: string | null
  notify_email: boolean
  notify_in_app: boolean
  is_active: boolean
  email_verified: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export async function getStudentById(id: number, centerId: number): Promise<StudentRow | null> {
  const result = await pool.query(
    `SELECT id, center_id, regno, full_name, email, mobile, father_name, address, state, city,
            pincode, date_of_birth, photo_url,
            COALESCE(notify_email, true) AS notify_email,
            COALESCE(notify_in_app, true) AS notify_in_app,
            is_active, email_verified, last_login_at, created_at, updated_at
     FROM students WHERE id = $1 AND center_id = $2`,
    [id, centerId]
  )
  return result.rows[0] || null
}

export async function getStudentByLogin(
  centerId: number,
  login: string
): Promise<(StudentRow & { password_hash: string }) | null> {
  const normalized = login.trim()
  const isEmail = normalized.includes('@')
  const result = await pool.query(
    isEmail
      ? `SELECT * FROM students WHERE center_id = $1 AND LOWER(email) = LOWER($2) AND is_active = true`
      : `SELECT * FROM students WHERE center_id = $1 AND mobile = $2 AND is_active = true`,
    [centerId, isEmail ? normalized : normalized.replace(/\D/g, '').slice(-10) || normalized]
  )
  return result.rows[0] || null
}

export async function generateStudentRegno(centerId: number): Promise<string> {
  const year = new Date().getFullYear()
  const result = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM students WHERE center_id = $1 AND regno LIKE $2`,
    [centerId, `STU${year}%`]
  )
  const seq = (result.rows[0]?.cnt || 0) + 1
  return `STU${year}${String(seq).padStart(5, '0')}`
}

export async function linkPaymentsToStudent(studentId: number, centerId: number, mobile: string) {
  await pool.query(
    `UPDATE student_fee_payments
     SET student_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE center_id = $2 AND student_mobile = $3 AND student_id IS NULL`,
    [studentId, centerId, mobile]
  )
}

export async function getStudentPayments(studentId: number, centerId: number) {
  const result = await pool.query(
    `SELECT sfp.*, cm.title AS course_title, cm.slug AS course_slug
     FROM student_fee_payments sfp
     LEFT JOIN course_masters cm ON cm.id = sfp.course_master_id
     WHERE sfp.center_id = $1
       AND (sfp.student_id = $2 OR (sfp.student_id IS NULL AND sfp.student_mobile = (
         SELECT mobile FROM students WHERE id = $2
       )))
     ORDER BY sfp.created_at DESC`,
    [centerId, studentId]
  )
  return result.rows
}

export async function getStudentInstallments(studentId: number, centerId: number) {
  const result = await pool.query(
    `SELECT spi.*, cm.title AS course_title, cm.slug AS course_slug, sfp.receipt_no
     FROM student_payment_installments spi
     JOIN student_fee_payments sfp ON sfp.id = spi.payment_id
     LEFT JOIN course_masters cm ON cm.id = spi.course_master_id
     WHERE spi.center_id = $1
       AND (sfp.student_id = $2 OR (sfp.student_id IS NULL AND spi.student_mobile = (
         SELECT mobile FROM students WHERE id = $2
       )))
     ORDER BY spi.due_date ASC NULLS LAST, spi.installment_no ASC`,
    [centerId, studentId]
  )
  return result.rows
}

export async function getStudentCourses(studentId: number, centerId: number) {
  const result = await pool.query(
    `WITH payment_courses AS (
       SELECT course_master_id, course_title, course_slug, short_description, total_paid, last_payment_at, source
       FROM (
         SELECT
           sfp.course_master_id,
           cm.title AS course_title,
           cm.slug AS course_slug,
           cm.short_description,
           SUM(sfp.amount_paid) OVER (PARTITION BY sfp.course_master_id) AS total_paid,
           MAX(sfp.created_at) OVER (PARTITION BY sfp.course_master_id) AS last_payment_at,
           'payment' AS source,
           ROW_NUMBER() OVER (PARTITION BY sfp.course_master_id ORDER BY sfp.created_at DESC) AS rn
         FROM student_fee_payments sfp
         LEFT JOIN course_masters cm ON cm.id = sfp.course_master_id
         WHERE sfp.center_id = $1
           AND sfp.status = 'completed'
           AND (sfp.student_id = $2 OR (sfp.student_id IS NULL AND sfp.student_mobile = (
             SELECT mobile FROM students WHERE id = $2
           )))
       ) ranked_payments
       WHERE rn = 1
     ),
     legacy_courses AS (
       SELECT course_master_id, course_title, course_slug, short_description, total_paid, last_payment_at, source
       FROM (
       SELECT
         se.course_id AS course_master_id,
         COALESCE(cm.title, se.course_name) AS course_title,
         cm.slug AS course_slug,
         cm.short_description,
         COALESCE(se.final_amount, 0) AS total_paid,
         se.created_at AS last_payment_at,
         'enrollment' AS source,
         ROW_NUMBER() OVER (
           PARTITION BY COALESCE(se.course_id, 0), se.course_name ORDER BY se.created_at DESC
         ) AS rn
       FROM student_enrollments se
       JOIN students st ON st.id = $2
         AND (st.mobile = se.mobile OR (st.email IS NOT NULL AND LOWER(st.email) = LOWER(se.email)))
       LEFT JOIN course_masters cm ON cm.id = se.course_id
       -- Legacy enrolments are matched on mobile/email, which are not unique
       -- across centers, so without this the branch returned another tenant's
       -- courses to anyone sharing a mobile number. NULL center_id is excluded
       -- rather than shown everywhere; see migration 0008.
       WHERE se.center_id = $1
         AND se.status IN ('active', 'completed', 'pending')
         AND NOT EXISTS (
           SELECT 1 FROM payment_courses pc WHERE pc.course_master_id = se.course_id
         )
       ) ranked_enrollments
       WHERE rn = 1
     )
     SELECT * FROM payment_courses
     UNION ALL
     SELECT * FROM legacy_courses
     ORDER BY last_payment_at DESC NULLS LAST`,
    [centerId, studentId]
  )
  return result.rows
}

export async function getStudentDashboardStats(studentId: number, centerId: number) {
  const [courses, payments, installments] = await Promise.all([
    getStudentCourses(studentId, centerId),
    getStudentPayments(studentId, centerId),
    getStudentInstallments(studentId, centerId),
  ])

  const totalPaid = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount_paid || 0), 0)

  const pendingInstallments = installments.filter(
    (i) => i.status === 'unpaid' || i.status === 'pending'
  )

  const upcomingDue = pendingInstallments
    .filter((i) => i.due_date)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]

  return {
    enrolledCourses: courses.length,
    totalPayments: payments.filter((p) => p.status === 'completed').length,
    totalPaid,
    pendingInstallments: pendingInstallments.length,
    upcomingDue,
    recentPayments: payments.slice(0, 5),
  }
}
