import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission } from '@/lib/admin-access'
import { parseQuery, idSchema } from '@/lib/api-validation'
import { unauthorized, serverError } from '@/lib/api-response'
import {

  listCoursesForCenterBatches,
  listPricingBatchesForCenter,
} from '@/lib/course-batches-db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const optionsQuery = z.object({ centerId: idSchema })

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const parsed = parseQuery(request, optionsQuery)
    if (!parsed.ok) return parsed.response
    const { centerId } = parsed.data

    const perm = await requireAdminPermission(token, centerId, 'batches', 'read')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const [courses, employees, pricingBatches] = await Promise.all([
      listCoursesForCenterBatches(centerId),
      pool.query(
        `SELECT id, full_name, employee_code, job_title, status
         FROM employees
         WHERE center_id = $1 AND status IN ('active', 'on_leave')
         ORDER BY full_name ASC
         LIMIT 300`,
        [centerId]
      ),
      listPricingBatchesForCenter(centerId),
    ])

    return NextResponse.json({
      courses,
      employees: employees.rows,
      pricingBatches,
    })
  } catch (error) {
    return serverError('admin-batches-options', error)
  }
}
