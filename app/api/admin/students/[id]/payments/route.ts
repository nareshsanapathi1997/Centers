import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission } from '@/lib/admin-access'
import { getStudentPayments } from '@/lib/student-portal-db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    const studentId = parseInt(params.id, 10)

    if (!centerId || !studentId) {
      return NextResponse.json({ error: 'centerId and student id required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'students', 'read')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const payments = await getStudentPayments(studentId, centerId)
    return NextResponse.json({ payments })
  } catch (error) {
    console.error('Admin student payments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
