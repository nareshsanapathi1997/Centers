import { NextRequest, NextResponse } from 'next/server'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import { getStudentAttendanceSummary } from '@/lib/attendance-db'
import { parseQuery } from '@/lib/api-validation'
import { studentCenterQuery } from '@/lib/attendance-validation'
import { unauthorized, serverError } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const parsed = parseQuery(request, studentCenterQuery)
    if (!parsed.ok) return parsed.response
    const { centerId } = parsed.data

    const token = getStudentToken(request)
    if (!token) return unauthorized()

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 403 })
    }

    const summary = await getStudentAttendanceSummary(auth.studentId!, centerId)
    return NextResponse.json(summary)
  } catch (error) {
    return serverError('student-attendance-summary', error)
  }
}
