import pool from './db'

export type StudentWithCenter = {
  id: number
  center_id: number
  center_slug: string
  center_name: string
  full_name: string
  email: string | null
  mobile: string
  regno: string | null
  password_hash: string
  last_login_at: string | null
}

function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

export async function findActiveStudentsByLogin(login: string): Promise<StudentWithCenter[]> {
  const trimmed = login.trim()
  const isEmail = trimmed.includes('@')

  if (isEmail) {
    const result = await pool.query(
      `SELECT s.id, s.center_id, s.full_name, s.email, s.mobile, s.regno, s.password_hash, s.last_login_at,
              c.slug AS center_slug, c.name AS center_name
       FROM students s
       JOIN centers c ON c.id = s.center_id AND c.is_active = true
       WHERE s.is_active = true AND LOWER(s.email) = LOWER($1)
       ORDER BY s.last_login_at DESC NULLS LAST, s.id DESC`,
      [trimmed]
    )
    return result.rows
  }

  const mobile = normalizeMobile(trimmed)
  const result = await pool.query(
    `SELECT s.id, s.center_id, s.full_name, s.email, s.mobile, s.regno, s.password_hash, s.last_login_at,
            c.slug AS center_slug, c.name AS center_name
     FROM students s
     JOIN centers c ON c.id = s.center_id AND c.is_active = true
     WHERE s.is_active = true AND s.mobile = $1
     ORDER BY s.last_login_at DESC NULLS LAST, s.id DESC`,
    [mobile]
  )
  return result.rows
}

export async function findActiveStudentsByMobile(mobile: string): Promise<StudentWithCenter[]> {
  const normalized = normalizeMobile(mobile)
  const result = await pool.query(
    `SELECT s.id, s.center_id, s.full_name, s.email, s.mobile, s.regno, s.password_hash, s.last_login_at,
            c.slug AS center_slug, c.name AS center_name
     FROM students s
     JOIN centers c ON c.id = s.center_id AND c.is_active = true
     WHERE s.is_active = true AND s.mobile = $1
     ORDER BY s.last_login_at DESC NULLS LAST, s.id DESC`,
    [normalized]
  )
  return result.rows
}

export async function findActiveStudentByEmail(email: string): Promise<StudentWithCenter | null> {
  const result = await pool.query(
    `SELECT s.id, s.center_id, s.full_name, s.email, s.mobile, s.regno, s.password_hash, s.last_login_at,
            c.slug AS center_slug, c.name AS center_name
     FROM students s
     JOIN centers c ON c.id = s.center_id AND c.is_active = true
     WHERE s.is_active = true AND LOWER(s.email) = LOWER($1)
     ORDER BY s.last_login_at DESC NULLS LAST
     LIMIT 1`,
    [email.trim()]
  )
  return result.rows[0] || null
}

/** Prefer most recently used account when the same mobile exists at multiple centres. */
export function pickPrimaryStudentAccount(students: StudentWithCenter[]): StudentWithCenter | null {
  if (students.length === 0) return null
  return students[0]
}
