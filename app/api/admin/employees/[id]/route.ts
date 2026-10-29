import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { parseBody, idSchema } from '@/lib/api-validation'
import { unauthorized, notFound, conflict, serverError, badRequest } from '@/lib/api-response'
import { logActivity } from '@/lib/activity-log'
import {

  deleteEmployee,
  getEmployeeById,
  isUniqueViolation,
  uniqueViolationMessage,
  updateEmployee,
} from '@/lib/employees-db'
import { employeeUpdateSchema } from '@/lib/employees-validation'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const centerIdQuery = z.object({ centerId: idSchema })

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const employeeId = Number(params.id)
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return badRequest('Invalid employee id')
    }

    const centerId = Number(request.nextUrl.searchParams.get('centerId') || 0)
    if (!centerId) return badRequest('centerId is required')

    const perm = await requireAdminPermission(token, centerId, 'employees', 'read')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const employee = await getEmployeeById(employeeId, centerId)
    if (!employee) return notFound('Employee not found')

    return NextResponse.json({ employee })
  } catch (error) {
    return serverError('admin-employees-get', error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const employeeId = Number(params.id)
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return badRequest('Invalid employee id')
    }

    const parsed = await parseBody(request, employeeUpdateSchema)
    if (!parsed.ok) return parsed.response

    const centerId =
      parsed.data.centerId || Number(request.nextUrl.searchParams.get('centerId') || 0)
    if (!centerId) return badRequest('centerId is required')

    const perm = await requireAdminPermission(
      token,
      centerId,
      'employees',
      httpMethodToAction(request.method)
    )
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    if (parsed.data.adminUserId) {
      const adminCheck = await pool.query(
        'SELECT id FROM center_admins WHERE id = $1 AND center_id = $2',
        [parsed.data.adminUserId, centerId]
      )
      if (adminCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Linked admin must belong to this center' }, { status: 400 })
      }
    }

    try {
      const employee = await updateEmployee(employeeId, centerId, parsed.data)
      if (!employee) return notFound('Employee not found')

      await logActivity(
        {
          user_type: 'admin',
          user_id: perm.adminId,
          center_id: centerId,
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
    return serverError('admin-employees-update', error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const employeeId = Number(params.id)
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return badRequest('Invalid employee id')
    }

    const query = centerIdQuery.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    if (!query.success) return badRequest('centerId is required')
    const { centerId } = query.data

    const perm = await requireAdminPermission(
      token,
      centerId,
      'employees',
      httpMethodToAction(request.method)
    )
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const existing = await getEmployeeById(employeeId, centerId)
    if (!existing) return notFound('Employee not found')

    const deleted = await deleteEmployee(employeeId, centerId)
    if (!deleted) return notFound('Employee not found')

    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'delete',
        entity_type: 'employee',
        entity_id: employeeId,
        entity_name: existing.full_name,
      },
      request
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError('admin-employees-delete', error)
  }
}
