import { BRAND } from '@/lib/brand'
import {
  encodeTutorStreamEvent,
  extractOpenRouterDelta,
  splitSsePayloads,
  type TutorChatMessage,
  type TutorStreamEvent,
} from './tutor-chat'

export const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
export const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini'

export function stripEnvQuotes(value: string): string {
  return value.trim().replace(/^['"]+|['"]+$/g, '').trim()
}

export function parseFallbackModels(value: string | undefined | null): string[] {
  if (!value) return []
  return stripEnvQuotes(value)
    .split(',')
    .map((item) => stripEnvQuotes(item))
    .filter(Boolean)
}

export function resolveOpenRouterChatUrl(baseUrl?: string | null): string {
  const base = stripEnvQuotes(baseUrl || DEFAULT_OPENROUTER_BASE_URL).replace(/\/+$/, '')
  if (base.endsWith('/chat/completions')) return base
  return `${base}/chat/completions`
}

export function getOpenRouterConfig() {
  const apiKey = stripEnvQuotes(process.env.OPENROUTER_API_KEY || '')
  const model = stripEnvQuotes(process.env.OPENROUTER_MODEL || '') || DEFAULT_OPENROUTER_MODEL
  const fallbackModels = parseFallbackModels(process.env.OPENROUTER_FALLBACK_MODELS).filter(
    (item) => item !== model
  )
  return {
    apiKey,
    configured: Boolean(apiKey),
    model,
    fallbackModels,
    chatUrl: resolveOpenRouterChatUrl(process.env.OPENROUTER_BASE_URL),
    referer:
      stripEnvQuotes(process.env.NEXT_PUBLIC_APP_URL || '') ||
      stripEnvQuotes(process.env.NEXT_PUBLIC_BASE_URL || '') ||
      'http://localhost:2500',
    title: stripEnvQuotes(process.env.OPENROUTER_APP_NAME || '') || `${BRAND.name} Center Manager`,
  }
}

export async function streamOpenRouterChat(input: {
  messages: TutorChatMessage[]
  systemPrompt: string
  signal?: AbortSignal
}): Promise<{ ok: true; body: ReadableStream<Uint8Array> } | { ok: false; status: number; error: string }> {
  const config = getOpenRouterConfig()
  if (!config.configured) {
    return { ok: false, status: 503, error: 'Chat is not configured yet. Add OPENROUTER_API_KEY in .env.' }
  }

  const response = await fetch(config.chatUrl, {
    method: 'POST',
    signal: input.signal,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.referer,
      'X-Title': config.title,
    },
    body: JSON.stringify({
      model: config.model,
      ...(config.fallbackModels.length ? { models: config.fallbackModels } : {}),
      stream: true,
      messages: [{ role: 'system', content: input.systemPrompt }, ...input.messages],
    }),
  })

  if (!response.ok || !response.body) {
    const fallback = 'The assistant could not reply just now. Try again in a moment.'
    let error = fallback
    try {
      const body = (await response.json()) as { error?: { message?: string } | string }
      const message = typeof body.error === 'string' ? body.error : body.error?.message
      if (message) error = message
    } catch {
      error = fallback
    }
    if (response.status === 401 || response.status === 403) {
      error = 'The OpenRouter key was rejected. Check OPENROUTER_API_KEY in .env.'
    }
    return { ok: false, status: 502, error }
  }

  return { ok: true, body: response.body }
}

export function openRouterSseToTutorStream(
  upstream: ReadableStream<Uint8Array>
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''
  let closed = false

  const enqueue = (controller: ReadableStreamDefaultController<Uint8Array>, event: TutorStreamEvent) => {
    controller.enqueue(encoder.encode(encodeTutorStreamEvent(event)))
  }

  const finish = (controller: ReadableStreamDefaultController<Uint8Array>, event?: TutorStreamEvent) => {
    if (closed) return
    if (event) enqueue(controller, event)
    closed = true
    controller.close()
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader()
      try {
        while (!closed) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const { payloads, rest } = splitSsePayloads(buffer)
          buffer = rest
          for (const payload of payloads) {
            const delta = extractOpenRouterDelta(payload)
            if (delta.text) enqueue(controller, { type: 'delta', text: delta.text })
            if (delta.error) {
              finish(controller, { type: 'error', error: delta.error })
              await reader.cancel().catch(() => undefined)
              return
            }
            if (delta.done) {
              finish(controller, { type: 'done' })
              return
            }
          }
        }
        finish(controller, { type: 'done' })
      } catch (error) {
        if (inputWasAborted(error)) {
          finish(controller)
          return
        }
        finish(controller, {
          type: 'error',
          error: error instanceof Error ? error.message : 'Stream failed',
        })
      }
    },
    cancel() {
      closed = true
    },
  })
}

function inputWasAborted(error: unknown) {
  return error instanceof Error && (error.name === 'AbortError' || /aborted/i.test(error.message))
}
