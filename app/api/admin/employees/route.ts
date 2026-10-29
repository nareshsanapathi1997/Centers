import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { parseBody, parseQuery, pageMeta } from '@/lib/api-validation'
import { unauthorized, conflict, serverError } from '@/lib/api-response'
import { logActivity } from '@/lib/activity-log'
import {

  createEmployee,
  EMPLOYEE_SELECT,
  isUniqueViolation,
  uniqueViolationMessage,
} from '@/lib/employees-db'
import { adminEmployeesListQuery, employeeWriteSchema } from '@/lib/employees-validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const parsed = parseQuery(request, adminEmployeesListQuery)
    if (!parsed.ok) return parsed.response
    const { centerId, search, status, employmentType, limit, offset, page, pageSize } = parsed.data

    const perm = await requireAdminPermission(token, centerId, 'employees', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const params: unknown[] = [centerId]
    const conditions = ['e.center_id = $1']

    if (search) {
      params.push(`%${search}%`)
      conditions.push(
        `(e.full_name ILIKE $${params.length} OR e.mobile ILIKE $${params.length} OR e.email ILIKE $${params.length} OR e.employee_code ILIKE $${params.length} OR e.job_title ILIKE $${params.length} OR e.department ILIKE $${params.length})`
      )
    }
    if (status) {
      params.push(status)
      conditions.push(`e.status = $${params.length}`)
    }
    if (employmentType) {
      params.push(employmentType)
      conditions.push(`e.employment_type = $${params.length}`)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM employees e ${where}`,
      params
    )
    const total = countResult.rows[0]?.total ?? 0

    const result = await pool.query(
      `SELECT ${EMPLOYEE_SELECT}
       FROM employees e
       ${where}
       ORDER BY e.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    return NextResponse.json({
      employees: result.rows,
      pagination: pageMeta({ page, pageSize, limit, offset }, total),
    })
  } catch (error) {
    return serverError('admin-employees-list', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const parsed = await parseBody(request, employeeWriteSchema)
    if (!parsed.ok) return parsed.response
    const data = parsed.data

    const perm = await requireAdminPermission(
      token,
      data.centerId,
      'employees',
      httpMethodToAction(request.method)
    )
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    if (data.adminUserId) {
      const adminCheck = await pool.query(
        'SELECT id FROM center_admins WHERE id = $1 AND center_id = $2',
        [data.adminUserId, data.centerId]
      )
      if (adminCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Linked admin must belong to this center' }, { status: 400 })
      }
    }

    try {
      const employee = await createEmployee(data)
      await logActivity(
        {
          user_type: 'admin',
          user_id: perm.adminId,
          center_id: data.centerId,
          action: 'create',
          entity_type: 'employee',
          entity_id: employee.id,
          entity_name: employee.full_name,
        },
        request
      )
      return NextResponse.json({ employee }, { status: 201 })
    } catch (error) {
      if (isUniqueViolation(error)) return conflict(uniqueViolationMessage(error))
      throw error
    }
  } catch (error) {
    return serverError('admin-employees-create', error)
  }
}
