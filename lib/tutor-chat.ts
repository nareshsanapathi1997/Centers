import { BRAND } from '@/lib/brand'
export const MAX_TUTOR_MESSAGES = 20
export const MAX_MESSAGE_CHARS = 4000

export type TutorChatRole = 'user' | 'assistant'

export type TutorChatMessage = {
  role: TutorChatRole
  content: string
}

export type TutorStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'error'; error: string }
  | { type: 'done' }

export function sanitizeTutorMessages(
  input: unknown
): { messages: TutorChatMessage[] } | { error: string } {
  if (!Array.isArray(input)) return { error: 'messages must be an array' }
  if (input.length === 0) return { error: 'messages are required' }
  if (input.length > MAX_TUTOR_MESSAGES) {
    return { error: `Send at most ${MAX_TUTOR_MESSAGES} messages` }
  }

  const messages: TutorChatMessage[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') return { error: 'Each message must be an object' }
    const role = 'role' in item ? item.role : null
    const rawContent = 'content' in item ? item.content : ''
    const content = typeof rawContent === 'string' ? rawContent.trim() : ''
    if (role !== 'user' && role !== 'assistant') return { error: 'Invalid message role' }
    if (!content) return { error: 'Message content is required' }
    if (content.length > MAX_MESSAGE_CHARS) {
      return { error: `Each message must be under ${MAX_MESSAGE_CHARS} characters` }
    }
    messages.push({ role, content })
  }

  if (messages[messages.length - 1]?.role !== 'user') {
    return { error: 'The last message must come from the user' }
  }

  return { messages }
}

export function buildTutorSystemPrompt(input: {
  studentName?: string
  centerName?: string
  courses?: string[]
}) {
  const name = input.studentName?.trim() || 'the student'
  const center = input.centerName?.trim() || BRAND.shortName
  const courses = (input.courses || []).map((course) => course.trim()).filter(Boolean).slice(0, 8)
  const courseLine = courses.length
    ? `They are studying: ${courses.join(', ')}.`
    : 'Use their question to infer the exam or subject.'

  return `You are the AI study companion for ${center}. You help ${name} understand concepts, plan revision, and practise for competitive exams (CAT, GATE, Bank, SSC, and similar).

${courseLine}

Guidelines:
- Explain clearly, step by step, in plain language. Use short examples.
- Do not write a full exam answer or essay the student can submit as their own work. Guide them to think.
- If a question is outside academics or centre processes, say so briefly and steer back to study.
- You are not a human faculty member and cannot change fees, batches, or official records.
- Keep replies focused and usually under 400 words unless the student asks for more depth.`
}

export function buildSiteChatSystemPrompt(input?: { pagePath?: string; pageTitle?: string }) {
  const pagePath = input?.pagePath?.trim().slice(0, 200)
  const pageTitle = input?.pageTitle?.trim().slice(0, 120)
  const pageLine =
    pagePath || pageTitle
      ? `The visitor is currently on ${[pageTitle, pagePath].filter(Boolean).join(' — ')}.`
      : `The visitor may be on any ${BRAND.shortName} page.`

  return `You are the ${BRAND.name} website assistant. Help visitors and staff with courses (CAT, GATE, Bank, SSC, NEET, CLAT and similar), centres, admissions, study questions, and how to use this site.

${pageLine}

Guidelines:
- Be concise, friendly, and practical.
- You cannot book seats, change fees, log people in, or access student or admin records.
- If they want to enrol or talk to a counsellor, point them to Enquire / Contact on the site.
- Do not write a full exam answer someone could submit as their own work.
- Keep replies usually under 220 words.`
}

export function splitSsePayloads(buffer: string): { payloads: string[]; rest: string } {
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''
  const payloads: string[] = []
  for (const part of parts) {
    const dataLines = part
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
    if (dataLines.length) payloads.push(dataLines.join('\n'))
  }
  return { payloads, rest }
}

export function extractOpenRouterDelta(data: string): {
  text?: string
  error?: string
  done?: boolean
} {
  if (data === '[DONE]') return { done: true }
  try {
    const parsed = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: unknown } }>
      error?: { message?: unknown } | string
    }
    const text = parsed?.choices?.[0]?.delta?.content
    const rawError = typeof parsed?.error === 'string' ? parsed.error : parsed?.error?.message
    return {
      text: typeof text === 'string' && text ? text : undefined,
      error: typeof rawError === 'string' && rawError ? rawError : undefined,
    }
  } catch {
    return {}
  }
}

export function consumeTutorSseBuffer(buffer: string): {
  events: TutorStreamEvent[]
  rest: string
} {
  const { payloads, rest } = splitSsePayloads(buffer)
  const events: TutorStreamEvent[] = []
  for (const payload of payloads) {
    if (payload === '[DONE]') {
      events.push({ type: 'done' })
      continue
    }
    try {
      const parsed = JSON.parse(payload) as Partial<TutorStreamEvent> & { text?: string; error?: string }
      if (parsed.type === 'delta' && typeof parsed.text === 'string' && parsed.text) {
        events.push({ type: 'delta', text: parsed.text })
      } else if (parsed.type === 'error' && typeof parsed.error === 'string') {
        events.push({ type: 'error', error: parsed.error })
      } else if (parsed.type === 'done') {
        events.push({ type: 'done' })
      }
    } catch {
      // Ignore a malformed event and keep reading the rest of the stream.
    }
  }
  return { events, rest }
}

export function encodeTutorStreamEvent(event: TutorStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}
