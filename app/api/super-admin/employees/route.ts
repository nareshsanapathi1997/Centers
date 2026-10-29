import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireSuperAdminPermission } from '@/lib/super-admin-access'
import { parseBody, parseQuery, pageMeta } from '@/lib/api-validation'
import { conflict, serverError } from '@/lib/api-response'
import { logActivity } from '@/lib/activity-log'
import {

  createEmployee,
  EMPLOYEE_SELECT,
  isUniqueViolation,
  uniqueViolationMessage,
} from '@/lib/employees-db'
import { employeeWriteSchema, superAdminEmployeesListQuery } from '@/lib/employees-validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const perm = await requireSuperAdminPermission(request, 'employees', 'read')
    if (!perm.ok) return perm.response

    const parsed = parseQuery(request, superAdminEmployeesListQuery)
    if (!parsed.ok) return parsed.response
    const { centerId, search, status, employmentType, limit, offset, page, pageSize } = parsed.data

    const params: unknown[] = []
    const conditions: string[] = []

    if (centerId) {
      params.push(centerId)
      conditions.push(`e.center_id = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(
        `(e.full_name ILIKE $${params.length} OR e.mobile ILIKE $${params.length} OR e.email ILIKE $${params.length} OR e.employee_code ILIKE $${params.length} OR c.name ILIKE $${params.length} OR e.job_title ILIKE $${params.length})`
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

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM employees e
       JOIN centers c ON c.id = e.center_id
       ${where}`,
      params
    )
    const total = countResult.rows[0]?.total ?? 0

    const result = await pool.query(
      `SELECT ${EMPLOYEE_SELECT}, c.name AS center_name, c.slug AS center_slug
       FROM employees e
       JOIN centers c ON c.id = e.center_id
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
    return serverError('super-admin-employees-list', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const perm = await requireSuperAdminPermission(request, 'employees', 'create')
    if (!perm.ok) return perm.response

    const parsed = await parseBody(request, employeeWriteSchema)
    if (!parsed.ok) return parsed.response
    const data = parsed.data

    const centerCheck = await pool.query('SELECT id FROM centers WHERE id = $1', [data.centerId])
    if (centerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }

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
          user_type: 'super_admin',
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
    return serverError('super-admin-employees-create', error)
  }
}
