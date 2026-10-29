import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { requireSuperAdminPermission } from '@/lib/super-admin-access'
import { parseQuery, idSchema } from '@/lib/api-validation'
import { badRequest, serverError } from '@/lib/api-response'
import {

  listCoursesForCenterBatches,
  listPricingBatchesForCenter,
} from '@/lib/course-batches-db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const optionsQuery = z.object({ centerId: idSchema })

export async function GET(request: NextRequest) {
  try {
    const perm = await requireSuperAdminPermission(request, 'batches', 'read')
    if (!perm.ok) return perm.response

    const parsed = parseQuery(request, optionsQuery)
    if (!parsed.ok) return parsed.response
    const { centerId } = parsed.data
    if (!centerId) return badRequest('centerId is required')

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
    return serverError('sa-batches-options', error)
  }
}
