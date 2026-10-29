import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { getAssessmentById, getLeaderboard } from '@/lib/student-assessments-db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = parseInt(params.id, 10)
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    if (!assessmentId || !centerId) {
      return NextResponse.json({ error: 'id and centerId are required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'assessments', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const assessment = await getAssessmentById(assessmentId, centerId)
    if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const leaderboard = await getLeaderboard(assessmentId, 100)
    return NextResponse.json({ leaderboard })
  } catch (error) {
    console.error('Admin leaderboard GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
