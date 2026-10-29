import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminPermission, hasSuperAdminPermission } from '@/lib/super-admin-access'
import { parseBody } from '@/lib/api-validation'
import { notFound, serverError, badRequest } from '@/lib/api-response'
import { logActivity } from '@/lib/activity-log'
import {

  assertEmployeeInCenter,
  deleteExpense,
  getExpenseById,
  isApprovalStatus,
  updateExpense,
} from '@/lib/expenses-db'
import { expenseUpdateSchema } from '@/lib/expenses-validation'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const perm = await requireSuperAdminPermission(request, 'expenses', 'read')
    if (!perm.ok) return perm.response

    const expenseId = Number(params.id)
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return badRequest('Invalid expense id')
    }

    const expense = await getExpenseById(expenseId)
    if (!expense) return notFound('Expense not found')

    return NextResponse.json({ expense })
  } catch (error) {
    return serverError('super-admin-expenses-get', error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expenseId = Number(params.id)
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return badRequest('Invalid expense id')
    }

    const parsed = await parseBody(request, expenseUpdateSchema)
    if (!parsed.ok) return parsed.response

    const existing = await getExpenseById(expenseId)
    if (!existing) return notFound('Expense not found')

    const nextStatus = parsed.data.status
    const needsApprove =
      nextStatus != null &&
      nextStatus !== existing.status &&
      isApprovalStatus(nextStatus)

    const perm = await requireSuperAdminPermission(
      request,
      'expenses',
      needsApprove ? 'approve' : 'update'
    )
    if (!perm.ok) return perm.response

    if (
      needsApprove &&
      Object.keys(parsed.data).some((k) => k !== 'centerId' && k !== 'status' && k !== 'approvalNotes')
    ) {
      if (!hasSuperAdminPermission(perm.profile, 'expenses', 'update') && !perm.profile.fullAccess) {
        const updatePerm = await requireSuperAdminPermission(request, 'expenses', 'update')
        if (!updatePerm.ok) return updatePerm.response
      }
    }

    const centerId = existing.center_id
    if (parsed.data.employeeId) {
      const employeeOk = await assertEmployeeInCenter(parsed.data.employeeId, centerId)
      if (!employeeOk) return badRequest('Employee must belong to this center')
    }

    const expense = await updateExpense(expenseId, centerId, parsed.data)
    if (!expense) return notFound('Expense not found')

    await logActivity(
      {
        user_type: 'super_admin',
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
    return serverError('super-admin-expenses-update', error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const perm = await requireSuperAdminPermission(request, 'expenses', 'delete')
    if (!perm.ok) return perm.response

    const expenseId = Number(params.id)
    if (!Number.isInteger(expenseId) || expenseId <= 0) {
      return badRequest('Invalid expense id')
    }

    const existing = await getExpenseById(expenseId)
    if (!existing) return notFound('Expense not found')

    const deleted = await deleteExpense(expenseId)
    if (!deleted) return notFound('Expense not found')

    await logActivity(
      {
        user_type: 'super_admin',
        user_id: perm.adminId,
        center_id: existing.center_id,
        action: 'delete',
        entity_type: 'expense',
        entity_id: expenseId,
        entity_name: `${existing.category} · ${existing.amount}`,
      },
      request
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError('super-admin-expenses-delete', error)
  }
}
