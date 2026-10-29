import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminPermission } from '@/lib/super-admin-access'
import { parseQuery } from '@/lib/api-validation'
import { notFound, serverError } from '@/lib/api-response'
import { getAttendanceRoster } from '@/lib/attendance-db'
import { attendanceRosterQuery } from '@/lib/attendance-validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const perm = await requireSuperAdminPermission(request, 'attendance', 'read')
    if (!perm.ok) return perm.response

    const parsed = parseQuery(request, attendanceRosterQuery)
    if (!parsed.ok) return parsed.response
    const { centerId, batchId, date } = parsed.data

    const result = await getAttendanceRoster(batchId, centerId, date)
    if (!result) return notFound('Batch not found')

    return NextResponse.json({
      batch: result.batch,
      date,
      roster: result.roster,
    })
  } catch (error) {
    return serverError('sa-attendance-roster', error)
  }
}
