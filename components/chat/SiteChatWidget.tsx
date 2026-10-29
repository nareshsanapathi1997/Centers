'use client'

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, Send, Square, X } from 'lucide-react'
import { withBasePath } from '@/lib/with-base-path'
import { consumeTutorSseBuffer, MAX_TUTOR_MESSAGES } from '@/lib/tutor-chat'
import '@/app/site-chat.css'

type Message = {
  id: number
  role: 'assistant' | 'user'
  text: string
}

const WELCOME_ID = 1

function nextMessageId() {
  return Date.now() + Math.floor(Math.random() * 1000)
}

function shouldHideChat(pathname: string | null) {
  if (!pathname) return false
  return /\/student\/exam(?:\/|$)/.test(pathname) || /^\/(?:admin|super-admin)(?:\/|$)/.test(pathname)
}

export default function SiteChatWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: WELCOME_ID,
      role: 'assistant',
      text: 'Hi — I can help with EduSphere courses, centres, admissions, or a study question. What do you need?',
    },
  ])
  const logRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('site-chat-open', open)
    return () => document.documentElement.classList.remove('site-chat-open')
  }, [open])

  useEffect(() => {
    const closeIfEnquiryOpen = () => {
      if (document.documentElement.classList.contains('enquiry-widget-open')) {
        setOpen(false)
        abortRef.current?.abort()
      }
    }
    closeIfEnquiryOpen()
    window.addEventListener('cm-open-enquiry', closeIfEnquiryOpen)
    const observer = new MutationObserver(closeIfEnquiryOpen)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => {
      window.removeEventListener('cm-open-enquiry', closeIfEnquiryOpen)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const node = logRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, busy, open])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  if (shouldHideChat(pathname)) return null

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
    setOpen(true)
    setMessages((current) => [...current, userMessage, { id: assistantId, role: 'assistant', text: '' }])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch(withBasePath('/api/public/chat'), {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-no-compression': '1',
        },
        body: JSON.stringify({
          messages: history,
          pagePath: pathname || '/',
          pageTitle: typeof document === 'undefined' ? '' : document.title,
        }),
      })

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'The assistant could not reply just now.')
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
        throw new Error('The assistant returned an empty reply. Try asking again.')
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
      const message = error instanceof Error ? error.message : 'The assistant could not reply just now.'
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
    <div className="site-chat">
      {open ? (
        <section className="site-chat__panel" role="dialog" aria-modal="true" aria-labelledby="site-chat-title">
          <header className="site-chat__head">
            <div>
              <p className="site-chat__eyebrow">EduSphere assistant</p>
              <h2 id="site-chat-title">Ask anything</h2>
              <p>{busy ? 'Writing a live reply…' : 'Courses, centres, and study help'}</p>
            </div>
            <button type="button" className="site-chat__close" aria-label="Close chat" onClick={() => setOpen(false)}>
              <X />
            </button>
          </header>
          <div className="site-chat__log" role="log" aria-live="polite" ref={logRef}>
            {messages.map((message) => {
              const streaming = busy && message.role === 'assistant' && message.id === messages[messages.length - 1]?.id
              return (
                <p
                  key={message.id}
                  className={`site-chat__bubble site-chat__bubble--${message.role}${streaming ? ' site-chat__bubble--streaming' : ''}`}
                >
                  {message.text || (streaming ? 'Thinking…' : '')}
                </p>
              )
            })}
          </div>
          <form className="site-chat__composer" onSubmit={submit}>
            <label htmlFor="site-chat-input" className="sr-only">Ask the assistant</label>
            <textarea
              id="site-chat-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder="Ask about a course, centre, or topic…"
              rows={3}
              disabled={busy}
            />
            <div className="site-chat__composer-foot">
              <span>Enter sends · Shift+Enter new line</span>
              {busy ? (
                <button type="button" className="site-chat__stop" onClick={stop}>
                  Stop <Square />
                </button>
              ) : (
                <button type="submit" className="site-chat__send" disabled={!draft.trim()}>
                  Send <Send />
                </button>
              )}
            </div>
          </form>
        </section>
      ) : (
        <button type="button" className="site-chat__fab" onClick={() => setOpen(true)}>
          <Bot aria-hidden />
          Ask AI
        </button>
      )}
    </div>
  )
}
