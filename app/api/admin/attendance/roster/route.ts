import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission } from '@/lib/admin-access'
import { parseQuery } from '@/lib/api-validation'
import { unauthorized, notFound, serverError } from '@/lib/api-response'
import { getAttendanceRoster } from '@/lib/attendance-db'
import { attendanceRosterQuery } from '@/lib/attendance-validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const parsed = parseQuery(request, attendanceRosterQuery)
    if (!parsed.ok) return parsed.response
    const { centerId, batchId, date } = parsed.data

    const perm = await requireAdminPermission(token, centerId, 'attendance', 'read')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const result = await getAttendanceRoster(batchId, centerId, date)
    if (!result) return notFound('Batch not found')

    return NextResponse.json({
      batch: result.batch,
      date,
      roster: result.roster,
    })
  } catch (error) {
    return serverError('admin-attendance-roster', error)
  }
}
