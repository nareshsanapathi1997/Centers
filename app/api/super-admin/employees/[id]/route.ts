import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireSuperAdminPermission } from '@/lib/super-admin-access'
import { parseBody } from '@/lib/api-validation'
import { notFound, conflict, serverError, badRequest } from '@/lib/api-response'
import { logActivity } from '@/lib/activity-log'
import {

  deleteEmployee,
  getEmployeeById,
  isUniqueViolation,
  uniqueViolationMessage,
  updateEmployee,
} from '@/lib/employees-db'
import { employeeUpdateSchema } from '@/lib/employees-validation'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const perm = await requireSuperAdminPermission(request, 'employees', 'read')
    if (!perm.ok) return perm.response

    const employeeId = Number(params.id)
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return badRequest('Invalid employee id')
    }

    const employee = await getEmployeeById(employeeId)
    if (!employee) return notFound('Employee not found')

    return NextResponse.json({ employee })
  } catch (error) {
    return serverError('super-admin-employees-get', error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const perm = await requireSuperAdminPermission(request, 'employees', 'update')
    if (!perm.ok) return perm.response

    const employeeId = Number(params.id)
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return badRequest('Invalid employee id')
    }

    const existing = await getEmployeeById(employeeId)
    if (!existing) return notFound('Employee not found')

    const parsed = await parseBody(request, employeeUpdateSchema)
    if (!parsed.ok) return parsed.response

    const centerId = parsed.data.centerId || existing.center_id

    if (parsed.data.adminUserId) {
      const adminCheck = await pool.query(
        'SELECT id FROM center_admins WHERE id = $1 AND center_id = $2',
        [parsed.data.adminUserId, centerId]
      )
      if (adminCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Linked admin must belong to this center' }, { status: 400 })
      }
    }

    // Super-admin may reassign center by updating center_id via a dedicated transfer later;
    // for now keep center fixed to the existing row.
    try {
      const employee = await updateEmployee(employeeId, existing.center_id, {
        ...parsed.data,
        centerId: existing.center_id,
      })
      if (!employee) return notFound('Employee not found')

      await logActivity(
        {
          user_type: 'super_admin',
          user_id: perm.adminId,
          center_id: existing.center_id,
          action: 'update',
          entity_type: 'employee',
          entity_id: employee.id,
          entity_name: employee.full_name,
        },
        request
      )

      return NextResponse.json({ employee })
    } catch (error) {
      if (isUniqueViolation(error)) return conflict(uniqueViolationMessage(error))
      throw error
    }
  } catch (error) {
    return serverError('super-admin-employees-update', error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const perm = await requireSuperAdminPermission(request, 'employees', 'delete')
    if (!perm.ok) return perm.response

    const employeeId = Number(params.id)
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return badRequest('Invalid employee id')
    }

    const existing = await getEmployeeById(employeeId)
    if (!existing) return notFound('Employee not found')

    const deleted = await deleteEmployee(employeeId)
    if (!deleted) return notFound('Employee not found')

    await logActivity(
      {
        user_type: 'super_admin',
        user_id: perm.adminId,
        center_id: existing.center_id,
        action: 'delete',
        entity_type: 'employee',
        entity_id: employeeId,
        entity_name: existing.full_name,
      },
      request
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError('super-admin-employees-delete', error)
  }
}
