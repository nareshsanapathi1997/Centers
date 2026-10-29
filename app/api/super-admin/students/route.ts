import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifySuperAdminAccess } from '@/lib/auth'
import pool from '@/lib/db'
import { optionalIdSchema, pageMeta, paginationQuery, parseQuery } from '@/lib/api-validation'
import { forbidden, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const StudentsQuery = z
  .object({
    search: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => value || undefined),
    centerId: optionalIdSchema,
  })
  .and(paginationQuery)

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySuperAdminAccess(request)
    if (!auth.isValid) {
      return forbidden(auth.error || 'Unauthorized')
    }

    const parsed = parseQuery(request, StudentsQuery)
    if (!parsed.ok) return parsed.response
    const { search, centerId, limit, offset, page, pageSize } = parsed.data

    const params: unknown[] = []
    const conditions: string[] = []

    if (centerId) {
      params.push(centerId)
      conditions.push(`s.center_id = $${params.length}`)
    }

    if (search) {
      params.push(`%${search}%`)
      conditions.push(
        `(s.full_name ILIKE $${params.length} OR s.mobile ILIKE $${params.length} OR s.email ILIKE $${params.length} OR c.name ILIKE $${params.length})`
      )
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    // Counted separately so the client can render a real pager. Previously this
    // returned up to 500 rows and the page rendered every one of them.
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM students s
       JOIN centers c ON c.id = s.center_id
       ${where}`,
      params
    )
    const total = countResult.rows[0]?.total ?? 0

    const result = await pool.query(
      `SELECT s.id, s.regno, s.full_name, s.email, s.mobile, s.is_active, s.last_login_at, s.created_at,
              c.id AS center_id, c.name AS center_name, c.slug AS center_slug,
              COUNT(sfp.id)::int AS payment_count
       FROM students s
       JOIN centers c ON c.id = s.center_id
       LEFT JOIN student_fee_payments sfp ON sfp.student_id = s.id
       ${where}
       GROUP BY s.id, c.id
       ORDER BY s.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    )

    return NextResponse.json({
      students: result.rows,
      pagination: pageMeta({ page, pageSize, limit, offset }, total),
    })
  } catch (error) {
    return serverError('super-admin-students', error)
  }
}
