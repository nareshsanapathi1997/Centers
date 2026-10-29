import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction, hasAdminPermission } from '@/lib/admin-access'
import { parseBody, idSchema } from '@/lib/api-validation'
import { unauthorized, notFound, serverError, badRequest } from '@/lib/api-response'
import { logActivity } from '@/lib/activity-log'
import {

  assertEmployeeInCenter,
  deleteExpense,
  getExpenseById,
  isApprovalStatus,
  updateExpense,
} from '@/lib/expenses-db'
import { expenseUpdateSchema } from '@/lib/expenses-validation'
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

    const expenseId = Number(params.id)
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return badRequest('Invalid expense id')
    }

    const centerId = Number(request.nextUrl.searchParams.get('centerId') || 0)
    if (!centerId) return badRequest('centerId is required')

    const perm = await requireAdminPermission(token, centerId, 'expenses', 'read')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const expense = await getExpenseById(expenseId, centerId)
    if (!expense) return notFound('Expense not found')

    return NextResponse.json({ expense })
  } catch (error) {
    return serverError('admin-expenses-get', error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const expenseId = Number(params.id)
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return badRequest('Invalid expense id')
    }

    const parsed = await parseBody(request, expenseUpdateSchema)
    if (!parsed.ok) return parsed.response

    const centerId =
      parsed.data.centerId || Number(request.nextUrl.searchParams.get('centerId') || 0)
    if (!centerId) return badRequest('centerId is required')

    const existing = await getExpenseById(expenseId, centerId)
    if (!existing) return notFound('Expense not found')

    const nextStatus = parsed.data.status
    const needsApprove =
      nextStatus != null &&
      nextStatus !== existing.status &&
      isApprovalStatus(nextStatus)

    const perm = await requireAdminPermission(
      token,
      centerId,
      'expenses',
      needsApprove ? 'approve' : httpMethodToAction(request.method)
    )
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    // Non-approval field edits still need update when only approve was checked above
    if (
      needsApprove &&
      Object.keys(parsed.data).some((k) => k !== 'centerId' && k !== 'status' && k !== 'approvalNotes')
    ) {
      if (!hasAdminPermission(perm.profile, 'expenses', 'update') && !perm.profile.fullAccess) {
        // Owners/fullAccess already passed; restricted roles need update for other fields
        const updatePerm = await requireAdminPermission(token, centerId, 'expenses', 'update')
        if (!updatePerm.ok) {
          return NextResponse.json({ error: updatePerm.error }, { status: updatePerm.status })
        }
      }
    }

    if (parsed.data.employeeId) {
      const employeeOk = await assertEmployeeInCenter(parsed.data.employeeId, centerId)
      if (!employeeOk) return badRequest('Employee must belong to this center')
    }

    const expense = await updateExpense(expenseId, centerId, parsed.data)
    if (!expense) return notFound('Expense not found')

    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: needsApprove ? 'approve' : 'update',
        entity_type: 'expense',
        entity_id: expense.id,
        entity_name: `${expense.category} · ${expense.amount}`,
        details: needsApprove ? { status: expense.status } : undefined,
      },
      request
    )

    return NextResponse.json({ expense })
  } catch (error) {
    return serverError('admin-expenses-update', error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const expenseId = Number(params.id)
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return badRequest('Invalid expense id')
    }

    const query = centerIdQuery.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries())
    )
    if (!query.success) return badRequest('centerId is required')
    const { centerId } = query.data

    const perm = await requireAdminPermission(
      token,
      centerId,
      'expenses',
      httpMethodToAction(request.method)
    )
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const existing = await getExpenseById(expenseId, centerId)
    if (!existing) return notFound('Expense not found')

    const deleted = await deleteExpense(expenseId, centerId)
    if (!deleted) return notFound('Expense not found')

    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: centerId,
        action: 'delete',
        entity_type: 'expense',
        entity_id: expenseId,
        entity_name: `${existing.category} · ${existing.amount}`,
      },
      request
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError('admin-expenses-delete', error)
  }
}
