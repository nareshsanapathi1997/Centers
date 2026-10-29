import { NextRequest } from 'next/server'
import { unauthorized, forbidden, badRequest, apiError, serverError } from '@/lib/api-response'
import { getOpenRouterConfig, openRouterSseToTutorStream, streamOpenRouterChat } from '@/lib/openrouter'
import { enforceRateLimit } from '@/lib/payment-rate-limit'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import { getStudentById, getStudentCourses } from '@/lib/student-portal-db'
import { buildTutorSystemPrompt, sanitizeTutorMessages } from '@/lib/tutor-chat'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const token = getStudentToken(request)
    if (!token) return unauthorized()

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequest('Invalid JSON body')
    }

    const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
    const centerId = Number(record.centerId)
    if (!Number.isInteger(centerId) || centerId <= 0) {
      return badRequest('centerId is required')
    }

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized || !auth.studentId) return forbidden(auth.error || 'Forbidden')

    const limit = await enforceRateLimit(request, `tutor:${auth.studentId}`, 20, 5 * 60_000)
    if (!limit.allowed) {
      return apiError('Too many tutor requests. Please wait a few minutes.', 429)
    }

    const sanitized = sanitizeTutorMessages(record.messages)
    if ('error' in sanitized) return badRequest(sanitized.error)

    if (!getOpenRouterConfig().configured) {
      return apiError('AI tutor is not configured yet. Add OPENROUTER_API_KEY in .env.', 503)
    }

    const [student, courses] = await Promise.all([
      getStudentById(auth.studentId, centerId),
      getStudentCourses(auth.studentId, centerId),
    ])

    const courseTitles = (courses || [])
      .map((course: { course_title?: string }) => course.course_title)
      .filter((title: string | undefined): title is string => Boolean(title))

    const upstream = await streamOpenRouterChat({
      messages: sanitized.messages,
      systemPrompt: buildTutorSystemPrompt({
        studentName: student?.full_name,
        centerName: typeof record.centerName === 'string' ? record.centerName : undefined,
        courses: courseTitles,
      }),
      signal: request.signal,
    })

    if (!upstream.ok) {
      return apiError(upstream.error, upstream.status)
    }

    return new Response(openRouterSseToTutorStream(upstream.body), {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(null, { status: 499 })
    }
    return serverError('student-tutor-chat', error)
  }
}
