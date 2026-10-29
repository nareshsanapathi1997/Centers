import { NextRequest, NextResponse } from 'next/server'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import { getAttemptById, recordProctorEvent } from '@/lib/student-assessments-db'

export const dynamic = 'force-dynamic'

const ALLOWED = new Set([
  'visibility_hidden',
  'visibility_visible',
  'blur',
  'focus',
  'fullscreen_exit',
  'copy',
  'paste',
  'contextmenu',
])

export async function POST(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const attemptId = parseInt(params.attemptId, 10)
    const body = await request.json()
    const centerId = parseInt(body.centerId, 10)
    if (!attemptId || !centerId) {
      return NextResponse.json({ error: 'attemptId and centerId are required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 })

    const attempt = await getAttemptById(attemptId)
    if (!attempt || attempt.student_id !== auth.studentId || attempt.center_id !== centerId) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    const eventType = String(body.eventType || body.event_type || '')
    if (!ALLOWED.has(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    // All allowed events are logged; only integrity-risk types increment the warning counter.
    const result = await recordProctorEvent(attemptId, eventType, body.meta || null)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 })
    }

    return NextResponse.json({
      message: 'Recorded',
      proctor_event_count: result.count,
    })
  } catch (error) {
    console.error('Student proctor event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
