import pool from '@/lib/db'
import type {
  EmployeeDocumentMeta,
  EmployeeRow,
  EmployeeStatus,
  EmploymentType,
} from '@/lib/employees-types'

export type {
  EmployeeDocumentMeta,
  EmployeeRow,
  EmployeeStatus,
  EmploymentType,
} from '@/lib/employees-types'
export { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from '@/lib/employees-types'

export const EMPLOYEE_COLUMNS = `
  id, center_id, employee_code, full_name, email, mobile, alternate_mobile,
  job_title, department, employment_type, status, join_date, end_date,
  date_of_birth, gender, address, city, state, pincode,
  emergency_contact_name, emergency_contact_phone, admin_user_id,
  COALESCE(documents, '[]'::jsonb) AS documents, notes,
  created_at, updated_at
`

export const EMPLOYEE_SELECT = `
  e.id, e.center_id, e.employee_code, e.full_name, e.email, e.mobile, e.alternate_mobile,
  e.job_title, e.department, e.employment_type, e.status, e.join_date, e.end_date,
  e.date_of_birth, e.gender, e.address, e.city, e.state, e.pincode,
  e.emergency_contact_name, e.emergency_contact_phone, e.admin_user_id,
  COALESCE(e.documents, '[]'::jsonb) AS documents, e.notes,
  e.created_at, e.updated_at
`

export function normalizeMobile(mobile: string | null | undefined): string | null {
  if (!mobile?.trim()) return null
  const digits = mobile.replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits || null
}

export function normalizeEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase()
  return value || null
}

export async function generateEmployeeCode(centerId: number): Promise<string> {
  const year = new Date().getFullYear()
  const result = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM employees WHERE center_id = $1 AND employee_code LIKE $2`,
    [centerId, `EMP${year}%`]
  )
  const seq = (result.rows[0]?.cnt || 0) + 1
  return `EMP${year}${String(seq).padStart(4, '0')}`
}

export async function getEmployeeById(
  id: number,
  centerId?: number
): Promise<EmployeeRow | null> {
  const params: unknown[] = [id]
  let where = 'WHERE e.id = $1'
  if (centerId != null) {
    params.push(centerId)
    where += ` AND e.center_id = $${params.length}`
  }

  const result = await pool.query(
    `SELECT ${EMPLOYEE_SELECT},
            c.name AS center_name, c.slug AS center_slug,
            ca.username AS admin_username, ca.full_name AS admin_full_name
     FROM employees e
     JOIN centers c ON c.id = e.center_id
     LEFT JOIN center_admins ca ON ca.id = e.admin_user_id
     ${where}`,
    params
  )
  return result.rows[0] || null
}

export type EmployeeWriteInput = {
  centerId: number
  employeeCode?: string | null
  fullName: string
  email?: string | null
  mobile?: string | null
  alternateMobile?: string | null
  jobTitle?: string | null
  department?: string | null
  employmentType?: EmploymentType
  status?: EmployeeStatus
  joinDate?: string | null
  endDate?: string | null
  dateOfBirth?: string | null
  gender?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  adminUserId?: number | null
  documents?: EmployeeDocumentMeta[]
  notes?: string | null
}

export async function createEmployee(input: EmployeeWriteInput): Promise<EmployeeRow> {
  const employeeCode =
    input.employeeCode?.trim() || (await generateEmployeeCode(input.centerId))
  const email = normalizeEmail(input.email)
  const mobile = normalizeMobile(input.mobile)

  const result = await pool.query(
    `INSERT INTO employees (
       center_id, employee_code, full_name, email, mobile, alternate_mobile,
       job_title, department, employment_type, status, join_date, end_date,
       date_of_birth, gender, address, city, state, pincode,
       emergency_contact_name, emergency_contact_phone, admin_user_id, documents, notes
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22::jsonb,$23
     )
     RETURNING ${EMPLOYEE_COLUMNS}`,
    [
      input.centerId,
      employeeCode,
      input.fullName.trim(),
      email,
      mobile,
      normalizeMobile(input.alternateMobile),
      input.jobTitle?.trim() || null,
      input.department?.trim() || null,
      input.employmentType || 'full_time',
      input.status || 'active',
      input.joinDate || null,
      input.endDate || null,
      input.dateOfBirth || null,
      input.gender?.trim() || null,
      input.address?.trim() || null,
      input.city?.trim() || null,
      input.state?.trim() || null,
      input.pincode?.trim() || null,
      input.emergencyContactName?.trim() || null,
      normalizeMobile(input.emergencyContactPhone),
      input.adminUserId || null,
      JSON.stringify(input.documents || []),
      input.notes?.trim() || null,
    ]
  )

  return result.rows[0]
}

export async function updateEmployee(
  id: number,
  centerId: number,
  input: Partial<EmployeeWriteInput>
): Promise<EmployeeRow | null> {
  const existing = await getEmployeeById(id, centerId)
  if (!existing) return null

  const email =
    input.email !== undefined ? normalizeEmail(input.email) : existing.email
  const mobile =
    input.mobile !== undefined ? normalizeMobile(input.mobile) : existing.mobile

  const result = await pool.query(
    `UPDATE employees SET
       employee_code = COALESCE($1, employee_code),
       full_name = COALESCE($2, full_name),
       email = $3,
       mobile = $4,
       alternate_mobile = $5,
       job_title = $6,
       department = $7,
       employment_type = COALESCE($8, employment_type),
       status = COALESCE($9, status),
       join_date = $10,
       end_date = $11,
       date_of_birth = $12,
       gender = $13,
       address = $14,
       city = $15,
       state = $16,
       pincode = $17,
       emergency_contact_name = $18,
       emergency_contact_phone = $19,
       admin_user_id = $20,
       documents = COALESCE($21::jsonb, documents),
       notes = $22,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $23 AND center_id = $24
     RETURNING ${EMPLOYEE_COLUMNS}`,
    [
      input.employeeCode?.trim() || null,
      input.fullName?.trim() || null,
      email,
      mobile,
      input.alternateMobile !== undefined
        ? normalizeMobile(input.alternateMobile)
        : existing.alternate_mobile,
      input.jobTitle !== undefined ? input.jobTitle?.trim() || null : existing.job_title,
      input.department !== undefined
        ? input.department?.trim() || null
        : existing.department,
      input.employmentType || null,
      input.status || null,
      input.joinDate !== undefined ? input.joinDate || null : existing.join_date,
      input.endDate !== undefined ? input.endDate || null : existing.end_date,
      input.dateOfBirth !== undefined
        ? input.dateOfBirth || null
        : existing.date_of_birth,
      input.gender !== undefined ? input.gender?.trim() || null : existing.gender,
      input.address !== undefined ? input.address?.trim() || null : existing.address,
      input.city !== undefined ? input.city?.trim() || null : existing.city,
      input.state !== undefined ? input.state?.trim() || null : existing.state,
      input.pincode !== undefined ? input.pincode?.trim() || null : existing.pincode,
      input.emergencyContactName !== undefined
        ? input.emergencyContactName?.trim() || null
        : existing.emergency_contact_name,
      input.emergencyContactPhone !== undefined
        ? normalizeMobile(input.emergencyContactPhone)
        : existing.emergency_contact_phone,
      input.adminUserId !== undefined ? input.adminUserId || null : existing.admin_user_id,
      input.documents !== undefined ? JSON.stringify(input.documents) : null,
      input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
      id,
      centerId,
    ]
  )

  return result.rows[0] || null
}

export async function deleteEmployee(id: number, centerId?: number): Promise<boolean> {
  const params: unknown[] = [id]
  let sql = 'DELETE FROM employees WHERE id = $1'
  if (centerId != null) {
    params.push(centerId)
    sql += ` AND center_id = $${params.length}`
  }
  const result = await pool.query(sql, params)
  return (result.rowCount || 0) > 0
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
  if (/employee_code/i.test(detail)) return 'Employee code already exists for this center'
  if (/email/i.test(detail)) return 'Email already exists for this center'
  if (/mobile/i.test(detail)) return 'Mobile already exists for this center'
  return 'An employee with these details already exists'
}
