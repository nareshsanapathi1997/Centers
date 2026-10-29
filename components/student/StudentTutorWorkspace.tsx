'use client'

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Bot, BookOpen, Check, Clock3, Send, Sparkles, Square } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { studentFetch } from '@/lib/student-api'
import { consumeTutorSseBuffer, MAX_TUTOR_MESSAGES } from '@/lib/tutor-chat'
import { useStudentPortal } from '@/components/student/StudentPortalContext'

type Message = {
  id: number
  role: 'assistant' | 'user'
  text: string
}

const WELCOME_ID = 1
const PROMPTS = [
  'Explain a difficult concept in simple language',
  'Build me a focused 30-minute study plan',
  'Help me revise my latest assessment',
]

function nextMessageId() {
  return Date.now() + Math.floor(Math.random() * 1000)
}

export default function StudentTutorWorkspace() {
  const { centerId, centerSlug: slug, centerName, student } = useStudentPortal()
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: WELCOME_ID,
      role: 'assistant',
      text: 'I’m your study companion. Ask a question or pick a prompt — I’ll stream an answer as soon as it is ready.',
    },
  ])
  const logRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const coursesQuery = useQuery({
    queryKey: ['student', 'tutor-context', centerId],
    queryFn: async () => {
      const response = await studentFetch(`/api/student/courses?centerId=${centerId}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Unable to load course context')
      return (data.courses || []) as Array<{ course_title?: string }>
    },
  })

  const contextTitle = useMemo(() => {
    const firstCourse = coursesQuery.data?.[0]?.course_title
    return firstCourse || 'Your enrolled courses'
  }, [coursesQuery.data])

  useEffect(() => {
    const node = logRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, busy])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const stop = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
  }

  const send = async (raw: string) => {
    const value = raw.trim()
    if (!value || busy) return

    const userMessage: Message = { id: nextMessageId(), role: 'user', text: value }
    const assistantId = nextMessageId() + 1
    const history = [...messages, userMessage]
      .filter((message) => message.id !== WELCOME_ID)
      .slice(-(MAX_TUTOR_MESSAGES - 1))
      .map((message) => ({ role: message.role, content: message.text }))

    setDraft('')
    setBusy(true)
    setMessages((current) => [...current, userMessage, { id: assistantId, role: 'assistant', text: '' }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await studentFetch('/api/student/tutor/chat', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'x-no-compression': '1' },
        body: JSON.stringify({
          centerId,
          centerName,
          studentName: student?.fullName,
          messages: history,
        }),
      })

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'The tutor could not reply just now.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assembled = ''

      while (true) {
        const { done, value: chunk } = await reader.read()
        if (done) break
        buffer += decoder.decode(chunk, { stream: true })
        const parsed = consumeTutorSseBuffer(buffer)
        buffer = parsed.rest
        for (const event of parsed.events) {
          if (event.type === 'delta') {
            assembled += event.text
            const snapshot = assembled
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId ? { ...message, text: snapshot } : message
              )
            )
          } else if (event.type === 'error') {
            throw new Error(event.error)
          }
        }
      }

      if (!assembled.trim()) {
        throw new Error('The tutor returned an empty reply. Try asking again.')
      }
    } catch (error) {
      if (controller.signal.aborted) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, text: message.text || 'Reply stopped.' }
              : message
          )
        )
        return
      }
      const message = error instanceof Error ? error.message : 'The tutor could not reply just now.'
      setMessages((current) =>
        current.map((item) => (item.id === assistantId ? { ...item, text: message } : item))
      )
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setBusy(false)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void send(draft)
  }

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send(draft)
    }
  }

  return (
    <div className="sp-tutor">
      <div className="sp-tutor__intro">
        <div>
          <p className="sp-tutor__eyebrow"><Sparkles aria-hidden /> Guided learning workspace</p>
          <h2>Ask better questions. Learn with momentum.</h2>
          <p>
            {student?.fullName ? `Hi ${student.fullName.split(' ')[0]}. ` : ''}
            Ask for an explanation, a revision plan, or help with a tough topic. Replies stream in live.
          </p>
        </div>
        <div className={`sp-tutor__status${busy ? ' sp-tutor__status--busy' : ' sp-tutor__status--live'}`} role="status">
          <span className="sp-tutor__status-dot" />
          <span>
            <strong>{busy ? 'Writing' : 'Live'}</strong>
            <small>{busy ? 'Streaming a reply' : 'OpenRouter answers'}</small>
          </span>
          <Sparkles aria-hidden />
        </div>
      </div>

      <div className="sp-tutor__layout">
        <aside className="sp-tutor__rail">
          <div className="sp-tutor__rail-head">
            <span className="sp-tutor__icon"><Bot aria-hidden /></span>
            <div>
              <h3>Study companion</h3>
              <p>Designed around {contextTitle}.</p>
            </div>
          </div>
          <div className="sp-tutor__rail-block">
            <p className="sp-tutor__label">Suggested sessions</p>
            <div className="sp-tutor__prompt-list">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={busy}
                  onClick={() => void send(prompt)}
                  className="sp-tutor__prompt"
                >
                  <span>{prompt}</span><ArrowUpRight aria-hidden />
                </button>
              ))}
            </div>
          </div>
          <div className="sp-tutor__rail-note">
            <BookOpen aria-hidden />
            <p><strong>Keep practising</strong><span>Use practice assessments to discover which topics you would like to ask about.</span></p>
          </div>
          <Link href={`/${slug}/student/assessments`} className="sp-btn sp-btn--secondary sp-btn--sm">
            Open assessments <ArrowUpRight aria-hidden />
          </Link>
        </aside>

        <section className="sp-tutor__conversation" aria-label="AI Tutor conversation">
          <div className="sp-tutor__conversation-head">
            <div>
              <p className="sp-tutor__label">New session</p>
              <h3>Learning desk</h3>
            </div>
            <span className="sp-chip"><Clock3 aria-hidden /> This session only</span>
          </div>
          <div className="sp-tutor__messages" role="log" aria-live="polite" ref={logRef}>
            {messages.map((message) => {
              const streaming = busy && message.role === 'assistant' && message.id === messages[messages.length - 1]?.id
              return (
                <div
                  key={message.id}
                  className={`sp-tutor__message sp-tutor__message--${message.role}${streaming ? ' sp-tutor__message--streaming' : ''}`}
                >
                  <span className="sp-tutor__message-avatar" aria-hidden>{message.role === 'assistant' ? <Bot /> : <Check />}</span>
                  <p>{message.text || (streaming ? 'Thinking…' : '')}</p>
                </div>
              )
            })}
          </div>
          <form className="sp-tutor__composer" onSubmit={submit}>
            <label htmlFor="student-tutor-prompt" className="sr-only">Ask your tutor</label>
            <textarea
              id="student-tutor-prompt"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder="Ask about a topic, test, or study plan…"
              rows={3}
              disabled={busy}
            />
            <div className="sp-tutor__composer-foot">
              <span>{busy ? 'Streaming reply · Enter sends, Shift+Enter adds a line' : 'Live OpenRouter replies · Enter sends, Shift+Enter adds a line'}</span>
              {busy ? (
                <button type="button" className="sp-btn sp-btn--secondary sp-btn--sm" onClick={stop}>
                  Stop <Square aria-hidden />
                </button>
              ) : (
                <button type="submit" className="sp-btn sp-btn--primary sp-btn--sm" disabled={!draft.trim()}>
                  Ask tutor <Send aria-hidden />
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
