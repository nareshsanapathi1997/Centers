import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireSuperAdminPermission, hasSuperAdminPermission } from '@/lib/super-admin-access'
import { parseBody, parseQuery, pageMeta } from '@/lib/api-validation'
import { badRequest, serverError } from '@/lib/api-response'
import { logActivity } from '@/lib/activity-log'
import {

  assertEmployeeInCenter,
  createExpense,
  EXPENSE_SELECT,
  expensesToCsv,
  getCategoryExpenseSummaries,
  getEmployeeExpenseSummaries,
  getExpenseSummary,
  isApprovalStatus,
} from '@/lib/expenses-db'
import { expenseWriteSchema, superAdminExpensesListQuery } from '@/lib/expenses-validation'

export const dynamic = 'force-dynamic'

function buildListFilters(data: {
  centerId?: number
  search?: string
  status?: string
  category?: string
  employeeId?: number
  dateFrom?: string
  dateTo?: string
}) {
  const params: unknown[] = []
  const conditions: string[] = []

  if (data.centerId) {
    params.push(data.centerId)
    conditions.push(`x.center_id = $${params.length}`)
  }
  if (data.search) {
    params.push(`%${data.search}%`)
    conditions.push(
      `(x.description ILIKE $${params.length} OR e.full_name ILIKE $${params.length} OR e.employee_code ILIKE $${params.length} OR c.name ILIKE $${params.length} OR x.notes ILIKE $${params.length})`
    )
  }
  if (data.status) {
    params.push(data.status)
    conditions.push(`x.status = $${params.length}`)
  }
  if (data.category) {
    params.push(data.category)
    conditions.push(`x.category = $${params.length}`)
  }
  if (data.employeeId) {
    params.push(data.employeeId)
    conditions.push(`x.employee_id = $${params.length}`)
  }
  if (data.dateFrom) {
    params.push(data.dateFrom)
    conditions.push(`x.expense_date >= $${params.length}::date`)
  }
  if (data.dateTo) {
    params.push(data.dateTo)
    conditions.push(`x.expense_date <= $${params.length}::date`)
  }

  return {
    params,
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
  }
}

export async function GET(request: NextRequest) {
  try {
    const perm = await requireSuperAdminPermission(request, 'expenses', 'read')
    if (!perm.ok) return perm.response

    const parsed = parseQuery(request, superAdminExpensesListQuery)
    if (!parsed.ok) return parsed.response
    const {
      centerId,
      search,
      status,
      category,
      employeeId,
      dateFrom,
      dateTo,
      export: exportFmt,
      limit,
      offset,
      page,
      pageSize,
    } = parsed.data

    const filter = { centerId, search, status, category, employeeId, dateFrom, dateTo }
    const { params, where } = buildListFilters(filter)

    if (exportFmt === 'csv') {
      const result = await pool.query(
        `SELECT ${EXPENSE_SELECT}, e.full_name AS employee_name, e.employee_code,
                c.name AS center_name, c.slug AS center_slug
         FROM expenses x
         JOIN employees e ON e.id = x.employee_id
         JOIN centers c ON c.id = x.center_id
         ${where}
         ORDER BY x.expense_date DESC, x.id DESC
         LIMIT 5000`,
        params
      )
      const csv = expensesToCsv(result.rows)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="expenses-all-centers.csv"',
        },
      })
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM expenses x
       JOIN employees e ON e.id = x.employee_id
       JOIN centers c ON c.id = x.center_id
       ${where}`,
      params
    )
    const total = countResult.rows[0]?.total ?? 0

    const result = await pool.query(
      `SELECT ${EXPENSE_SELECT}, e.full_name AS employee_name, e.employee_code,
              c.name AS center_name, c.slug AS center_slug
       FROM expenses x
       JOIN employees e ON e.id = x.employee_id
       JOIN centers c ON c.id = x.center_id
       ${where}
       ORDER BY x.expense_date DESC, x.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    const [summary, byEmployee, byCategory] = await Promise.all([
      getExpenseSummary(filter),
      getEmployeeExpenseSummaries(filter),
      getCategoryExpenseSummaries(filter),
    ])

    return NextResponse.json({
      expenses: result.rows,
      pagination: pageMeta({ page, pageSize, limit, offset }, total),
      summary,
      byEmployee,
      byCategory,
    })
  } catch (error) {
    return serverError('super-admin-expenses-list', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const perm = await requireSuperAdminPermission(request, 'expenses', 'create')
    if (!perm.ok) return perm.response

    const parsed = await parseBody(request, expenseWriteSchema)
    if (!parsed.ok) return parsed.response
    const data = parsed.data

    if (isApprovalStatus(data.status) && !hasSuperAdminPermission(perm.profile, 'expenses', 'approve')) {
      return NextResponse.json(
        { error: 'sa.expenses.approve permission required for this status' },
        { status: 403 }
      )
    }

    const centerCheck = await pool.query('SELECT id FROM centers WHERE id = $1', [data.centerId])
    if (centerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }

    const employeeOk = await assertEmployeeInCenter(data.employeeId, data.centerId)
    if (!employeeOk) {
      return badRequest('Employee must belong to this center')
    }

    const expense = await createExpense(data)
    await logActivity(
      {
        user_type: 'super_admin',
        user_id: perm.adminId,
        center_id: data.centerId,
        action: 'create',
        entity_type: 'expense',
        entity_id: expense.id,
        entity_name: `${expense.category} · ${expense.amount}`,
      },
      request
    )
    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    return serverError('super-admin-expenses-create', error)
  }
}
