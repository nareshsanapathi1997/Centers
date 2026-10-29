import { NextRequest } from 'next/server'
import { badRequest, apiError, serverError } from '@/lib/api-response'
import { getOpenRouterConfig, openRouterSseToTutorStream, streamOpenRouterChat } from '@/lib/openrouter'
import { enforceRateLimit } from '@/lib/payment-rate-limit'
import { buildSiteChatSystemPrompt, sanitizeTutorMessages } from '@/lib/tutor-chat'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const limit = await enforceRateLimit(request, 'site-chat', 12, 5 * 60_000)
    if (!limit.allowed) {
      return apiError('Too many chat requests. Please wait a few minutes.', 429)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequest('Invalid JSON body')
    }

    const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
    const sanitized = sanitizeTutorMessages(record.messages)
    if ('error' in sanitized) return badRequest(sanitized.error)

    if (!getOpenRouterConfig().configured) {
      return apiError('Chat is not configured yet. Add OPENROUTER_API_KEY in .env.', 503)
    }

    const pagePath = typeof record.pagePath === 'string' ? record.pagePath : undefined
    const pageTitle = typeof record.pageTitle === 'string' ? record.pageTitle : undefined

    const upstream = await streamOpenRouterChat({
      messages: sanitized.messages,
      systemPrompt: buildSiteChatSystemPrompt({ pagePath, pageTitle }),
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
    return serverError('public-chat', error)
  }
}
