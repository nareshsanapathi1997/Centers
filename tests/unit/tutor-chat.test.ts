import { describe, expect, it } from 'vitest'
import {
  buildSiteChatSystemPrompt,
  buildTutorSystemPrompt,
  consumeTutorSseBuffer,
  extractOpenRouterDelta,
  MAX_MESSAGE_CHARS,
  MAX_TUTOR_MESSAGES,
  sanitizeTutorMessages,
  splitSsePayloads,
} from '@/lib/tutor-chat'
import { parseFallbackModels, resolveOpenRouterChatUrl, stripEnvQuotes } from '@/lib/openrouter'

describe('sanitizeTutorMessages', () => {
  it('accepts a short user/assistant history ending with the student', () => {
    const result = sanitizeTutorMessages([
      { role: 'assistant', content: 'How can I help?' },
      { role: 'user', content: 'Explain permutations.' },
    ])
    expect(result).toEqual({
      messages: [
        { role: 'assistant', content: 'How can I help?' },
        { role: 'user', content: 'Explain permutations.' },
      ],
    })
  })

  it('rejects an empty payload and a history that does not end with the student', () => {
    expect(sanitizeTutorMessages([])).toEqual({ error: 'messages are required' })
    expect(sanitizeTutorMessages([{ role: 'assistant', content: 'Hello' }])).toEqual({
      error: 'The last message must come from the user',
    })
  })

  it('rejects oversized histories and overlong content', () => {
    const tooMany = Array.from({ length: MAX_TUTOR_MESSAGES + 1 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${index}`,
    }))
    tooMany[tooMany.length - 1] = { role: 'user', content: 'last' }
    expect(sanitizeTutorMessages(tooMany)).toEqual({
      error: `Send at most ${MAX_TUTOR_MESSAGES} messages`,
    })
    expect(
      sanitizeTutorMessages([{ role: 'user', content: 'x'.repeat(MAX_MESSAGE_CHARS + 1) }])
    ).toEqual({
      error: `Each message must be under ${MAX_MESSAGE_CHARS} characters`,
    })
  })
})

describe('buildTutorSystemPrompt', () => {
  it('includes the student, centre, and enrolled courses', () => {
    const prompt = buildTutorSystemPrompt({
      studentName: 'Asha',
      centerName: 'EduSphere Hyderabad',
      courses: ['CAT 2026', 'Bank PO'],
    })
    expect(prompt).toContain('Asha')
    expect(prompt).toContain('EduSphere Hyderabad')
    expect(prompt).toContain('CAT 2026, Bank PO')
  })
})

describe('SSE helpers', () => {
  it('splits complete SSE frames and keeps a partial tail', () => {
    expect(splitSsePayloads('data: one\n\ndata: two\n\ndata: par')).toEqual({
      payloads: ['one', 'two'],
      rest: 'data: par',
    })
  })

  it('reads OpenRouter token deltas and the done sentinel', () => {
    expect(extractOpenRouterDelta('[DONE]')).toEqual({ done: true })
    expect(
      extractOpenRouterDelta(JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] }))
    ).toEqual({ text: 'Hello' })
  })

  it('parses the client tutor event stream incrementally', () => {
    const first = consumeTutorSseBuffer('data: {"type":"delta","text":"Hi"}\n\ndata: {"type":"d')
    expect(first.events).toEqual([{ type: 'delta', text: 'Hi' }])
    const second = consumeTutorSseBuffer(`${first.rest}one"}\n\n`)
    expect(second.events).toEqual([{ type: 'done' }])
  })
})

describe('OpenRouter env helpers', () => {
  it('strips wrapping quotes from .env values', () => {
    expect(stripEnvQuotes('"openrouter/auto"')).toBe('openrouter/auto')
  })

  it('parses fallback models from a quoted comma list', () => {
    expect(parseFallbackModels('"google/gemini-2.5-flash,qwen/qwen3.7-flash"')).toEqual([
      'google/gemini-2.5-flash',
      'qwen/qwen3.7-flash',
    ])
  })

  it('builds the chat completions URL from OPENROUTER_BASE_URL', () => {
    expect(resolveOpenRouterChatUrl('https://openrouter.ai/api/v1')).toBe(
      'https://openrouter.ai/api/v1/chat/completions'
    )
    expect(resolveOpenRouterChatUrl('https://openrouter.ai/api/v1/chat/completions')).toBe(
      'https://openrouter.ai/api/v1/chat/completions'
    )
  })
})

describe('buildSiteChatSystemPrompt', () => {
  it('includes the current page so the bot can stay on context', () => {
    const prompt = buildSiteChatSystemPrompt({ pagePath: '/courses', pageTitle: 'Courses' })
    expect(prompt).toContain('Courses')
    expect(prompt).toContain('/courses')
  })
})
