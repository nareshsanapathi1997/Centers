import { NextRequest, NextResponse } from 'next/server'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import { getStudentCourses } from '@/lib/student-portal-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 })

    const courses = await getStudentCourses(auth.studentId!, centerId)
    return NextResponse.json({ courses })
  } catch (error) {
    console.error('Student courses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
