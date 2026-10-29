'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { studentFetch } from '@/lib/student-api'
import { useStudentPortal } from '@/components/student/StudentPortalContext'
import { withBasePathHref } from '@/lib/with-base-path'

const AssessmentRichContent = dynamic(
  () => import('@/components/assessments/AssessmentRichContent'),
  {
    ssr: false,
    loading: () => <div className="sp-skeleton" style={{ height: 28, margin: '8px 0' }} aria-hidden />,
  }
)

type AnswerState = {
  selectedOptionId: string | null
  selectedOptionIds: string[] | null
  numericAnswer: number | null
}

function formatRemaining(ms: number) {
  if (ms <= 0) return '00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function emptyAnswer(): AnswerState {
  return { selectedOptionId: null, selectedOptionIds: null, numericAnswer: null }
}

function normalizeAnswers(raw: Record<string, any> | null | undefined): Record<string, AnswerState> {
  const out: Record<string, AnswerState> = {}
  if (!raw) return out
  for (const [k, v] of Object.entries(raw)) {
    if (v && typeof v === 'object' && ('selectedOptionId' in v || 'numericAnswer' in v || 'selectedOptionIds' in v)) {
      out[k] = {
        selectedOptionId: v.selectedOptionId ?? null,
        selectedOptionIds: v.selectedOptionIds ?? null,
        numericAnswer: v.numericAnswer ?? null,
      }
    } else if (typeof v === 'string' || v === null) {
      // Legacy flat map: questionId -> selected_option_id
      out[k] = { selectedOptionId: v, selectedOptionIds: null, numericAnswer: null }
    }
  }
  return out
}

function isAnswered(a: AnswerState | undefined, questionType: string): boolean {
  if (!a) return false
  if (questionType === 'numeric') return a.numericAnswer != null && Number.isFinite(a.numericAnswer)
  if (questionType === 'multiple_choice') return Array.isArray(a.selectedOptionIds) && a.selectedOptionIds.length > 0
  return Boolean(a.selectedOptionId)
}

export default function StudentExamTake() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { centerId: centerIdNum, centerSlug: slug } = useStudentPortal()
  const centerId = String(centerIdNum)
  const assessmentId = (params.assessmentId || params.id) as string
  const listHref = `/${slug}/student/assessments`
  const examBase = `/${slug}/student/exam/${assessmentId}`

  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const [attempt, setAttempt] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [passages, setPassages] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const [proctorWarnings, setProctorWarnings] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [leaderboard, setLeaderboard] = useState<any[] | null>(null)
  const [review, setReview] = useState<any>(null)

  const endsAtRef = useRef<number | null>(null)
  const skewRef = useRef(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptIdRef = useRef<number | null>(null)
  const submittingRef = useRef(false)
  const [reviewLoadFailed, setReviewLoadFailed] = useState(false)

  const loadMeta = useCallback(async (cid: string) => {
    const res = await studentFetch(`/api/student/assessments/${assessmentId}?centerId=${cid}`)
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Unable to load assessment')
      return
    }
    setMeta(data)
  }, [assessmentId])

  const hydrateAttempt = useCallback((data: any) => {
    setAttempt(data.attempt)
    setQuestions(data.questions || [])
    setSections(data.sections || [])
    setPassages(data.passages || [])
    setAnswers(normalizeAnswers(data.answers))
    attemptIdRef.current = data.attempt.id
    const serverNow = new Date(data.attempt.server_now || Date.now()).getTime()
    skewRef.current = serverNow - Date.now()
    endsAtRef.current = new Date(data.attempt.ends_at).getTime()
    setRemainingMs(Math.max(0, endsAtRef.current - (Date.now() + skewRef.current)))
    setProctorWarnings(data.attempt.proctor_event_count || 0)
  }, [])

  const loadAttempt = useCallback(async (cid: string, attemptId: number) => {
    const res = await studentFetch(`/api/student/assessments/attempts/${attemptId}?centerId=${cid}`)
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Unable to load attempt')
      return
    }
    if (data.attempt.status !== 'in_progress') {
      const reviewRes = await studentFetch(
        `/api/student/assessments/attempts/${attemptId}/review?centerId=${cid}`
      )
      if (reviewRes.ok) {
        setReview(await reviewRes.json())
        setReviewLoadFailed(false)
      } else {
        setReviewLoadFailed(true)
      }
      setAttempt(data.attempt)
      return
    }
    hydrateAttempt(data)
  }, [hydrateAttempt])

  useEffect(() => {
    if (!centerId) {
      setError('Session center is missing. Please sign in again.')
      setLoading(false)
      return
    }
    ;(async () => {
      setLoading(true)
      try {
        await loadMeta(centerId)
        const resumeId = searchParams.get('attemptId')
        if (resumeId) await loadAttempt(centerId, parseInt(resumeId, 10))
      } finally {
        setLoading(false)
      }
    })()
  }, [centerId, loadMeta, loadAttempt, searchParams])

  const start = async () => {
    if (!centerId) return
    setStarting(true)
    setError('')
    try {
      const res = await studentFetch(`/api/student/assessments/${assessmentId}/start`, {
        method: 'POST',
        body: JSON.stringify({ centerId: parseInt(centerId, 10) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Unable to start')
        return
      }
      hydrateAttempt(data)
      router.replace(`${examBase}?attemptId=${data.attempt.id}`)
    } finally {
      setStarting(false)
    }
  }

  const inProgress = Boolean(attempt && attempt.status === 'in_progress')

  // Warn on tab close / refresh while an attempt is in progress.
  useEffect(() => {
    if (!inProgress) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [inProgress])

  // Intercept browser back while in progress.
  useEffect(() => {
    if (!inProgress) return
    const unlockRef = { current: false }
    const onPopState = () => {
      if (unlockRef.current) return
      const leave = window.confirm(
        'Leave this exam? Your answers are saved, but the timer will keep running.'
      )
      if (!leave) {
        history.pushState(null, '', window.location.href)
        return
      }
      unlockRef.current = true
      router.push(listHref)
    }
    history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [inProgress, listHref, router])

  // Block in-app link navigation out of the exam while in progress.
  useEffect(() => {
    if (!inProgress) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href') || ''
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return
      if (href.includes(`/student/exam/${assessmentId}`)) return
      const leave = window.confirm(
        'Leave this exam? Your answers are saved, but the timer will keep running.'
      )
      if (!leave) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [assessmentId, inProgress])

  const persistAnswers = useCallback(
    async (nextAnswers: Record<string, AnswerState>): Promise<boolean> => {
      if (!centerId || !attemptIdRef.current) return false
      const payload = Object.entries(nextAnswers).map(([questionId, ans]) => ({
        questionId: Number(questionId),
        selectedOptionId: ans.selectedOptionId,
        selectedOptionIds: ans.selectedOptionIds,
        numericAnswer: ans.numericAnswer,
      }))
      try {
        const res = await studentFetch(`/api/student/assessments/attempts/${attemptIdRef.current}`, {
          method: 'PUT',
          body: JSON.stringify({
            centerId: parseInt(centerId, 10),
            answers: payload,
          }),
        })
        return res.ok
      } catch {
        return false
      }
    },
    [centerId]
  )

  const scheduleSave = (next: Record<string, AnswerState>) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void persistAnswers(next)
    }, 600)
  }

  const updateAnswer = (questionId: number, patch: Partial<AnswerState>) => {
    const key = String(questionId)
    const prev = answers[key] || emptyAnswer()
    const next = {
      ...answers,
      [key]: { ...prev, ...patch },
    }
    setAnswers(next)
    scheduleSave(next)
  }

  const selectSingle = (questionId: number, optionId: string) => {
    updateAnswer(questionId, { selectedOptionId: optionId, selectedOptionIds: null, numericAnswer: null })
  }

  const toggleMulti = (questionId: number, optionId: string) => {
    const prev = answers[String(questionId)]?.selectedOptionIds || []
    const nextIds = prev.includes(optionId)
      ? prev.filter((id) => id !== optionId)
      : [...prev, optionId]
    updateAnswer(questionId, {
      selectedOptionIds: nextIds,
      selectedOptionId: nextIds[0] || null,
      numericAnswer: null,
    })
  }

  const setNumeric = (questionId: number, value: string) => {
    const n = value.trim() === '' ? null : Number(value)
    updateAnswer(questionId, {
      numericAnswer: n != null && Number.isFinite(n) ? n : null,
      selectedOptionId: null,
      selectedOptionIds: null,
    })
  }

  const submit = async (auto = false) => {
    if (!centerId || !attemptIdRef.current || submittingRef.current) return
    if (!auto && !window.confirm('Submit this assessment? You cannot change answers afterwards.')) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const saved = await persistAnswers(answers)
      if (!saved && !auto) {
        setError('Could not save your latest answers. Check your connection and try submit again.')
        return
      }
      const res = await studentFetch(
        `/api/student/assessments/attempts/${attemptIdRef.current}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({ centerId: parseInt(centerId, 10) }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Submit failed')
        return
      }
      endsAtRef.current = null
      setRemainingMs(null)
      if (data.review) {
        setReview(data.review)
        setReviewLoadFailed(false)
      } else if (attemptIdRef.current) {
        const reviewRes = await studentFetch(
          `/api/student/assessments/attempts/${attemptIdRef.current}/review?centerId=${centerId}`
        )
        if (reviewRes.ok) {
          setReview(await reviewRes.json())
          setReviewLoadFailed(false)
        } else {
          setReviewLoadFailed(true)
        }
      }
      setAttempt(data.attempt)
      const mode = meta?.assessment?.mode
      // Refresh lobby meta so attemptsRemaining / retake CTA stay accurate.
      await loadMeta(centerId)
      if (mode === 'live' && data.resultsVisible) {
        const lb = await studentFetch(
          `/api/student/assessments/${assessmentId}/leaderboard?centerId=${centerId}`
        )
        if (lb.ok) {
          const lbData = await lb.json()
          setLeaderboard(lbData.leaderboard || [])
        }
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress') return
    const tick = () => {
      if (!endsAtRef.current || submittingRef.current) return
      const left = endsAtRef.current - (Date.now() + skewRef.current)
      setRemainingMs(Math.max(0, left))
      if (left <= 0) void submit(true)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.id, attempt?.status])

  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress' || !centerId) return

    const postEvent = (eventType: string) => {
      void studentFetch(`/api/student/assessments/attempts/${attempt.id}/proctor-event`, {
        method: 'POST',
        body: JSON.stringify({
          centerId: parseInt(centerId, 10),
          eventType,
        }),
      }).then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        if (typeof data.proctor_event_count === 'number') {
          setProctorWarnings(data.proctor_event_count)
        }
      })
    }

    // visibility_hidden alone covers tab switches; blur doubles the count when alert steals focus.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        postEvent('visibility_hidden')
        window.alert('Warning: Leaving the exam tab is recorded. Return to continue.')
      }
    }
    const onCopy = () => postEvent('copy')
    const onPaste = () => postEvent('paste')
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      postEvent('contextmenu')
    }

    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('copy', onCopy)
    document.addEventListener('paste', onPaste)
    document.addEventListener('contextmenu', onContextMenu)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('contextmenu', onContextMenu)
    }
  }, [attempt, centerId])

  const current = questions[currentIdx]
  const currentSection = current?.section_id
    ? sections.find((s) => s.id === current.section_id)
    : null
  const currentPassage = current?.passage_id
    ? passages.find((p) => p.id === current.passage_id) ||
      (review?.passages || []).find((p: any) => p.id === current.passage_id)
    : null

  const answeredCount = useMemo(
    () =>
      questions.filter((q) => isAnswered(answers[String(q.id)], q.question_type || 'single_choice'))
        .length,
    [questions, answers]
  )

  if (loading) {
    return (
      <div className="sp-exam-shell">
        <div className="sp-exam-shell__body">
          <div className="sp-skeleton" aria-busy="true" aria-label="Loading assessment" />
        </div>
      </div>
    )
  }

  if (error && !meta) {
    return (
      <div className="sp-exam-shell">
        <div className="sp-exam-shell__body sp-page">
          <div className="sp-alert sp-alert--error" role="alert">
            {error}
          </div>
          <Link href={listHref} className="sp-back">
            ← Back to Quizzes
          </Link>
        </div>
      </div>
    )
  }

  // Results / review view
  if (review || (attempt && attempt.status !== 'in_progress')) {
    const r = review
    const reviewPassages = r?.passages || passages
    return (
      <div className="sp-exam-shell">
        <header className="sp-exam-shell__top">
          <div>
            <p className="sp-exam-shell__kicker">Results</p>
            <h1 className="sp-exam-shell__title">{r?.assessment?.title || meta?.assessment?.title}</h1>
          </div>
          <Link href={listHref} className="sp-btn sp-btn--ghost sp-btn--sm">
            Back to Quizzes
          </Link>
        </header>
        <div className="sp-exam-shell__body sp-page">
        <div className="sp-card-plain">
          <h2 className="sp-item__title" style={{ fontSize: '1.125rem' }}>
            Attempt summary
          </h2>
          <div className="sp-item__meta" style={{ marginTop: 10 }}>
            <span className="sp-chip">Status: {attempt?.status || r?.attempt?.status}</span>
            {r?.resultsVisible && r?.attempt?.score != null ? (
              <span className="sp-chip">
                Score {r.attempt.score} / {r.attempt.max_score}
              </span>
            ) : r && !r.resultsVisible ? (
              <span className="sp-chip">Results hidden for now</span>
            ) : null}
            {r?.attempt?.rank != null ? <span className="sp-chip">Rank #{r.attempt.rank}</span> : null}
            {r?.attempt?.proctor_event_count ? (
              <span className="sp-chip">Proctoring flags: {r.attempt.proctor_event_count}</span>
            ) : null}
          </div>
        </div>

        {leaderboard && leaderboard.length > 0 && (
          <div className="sp-table-wrap">
            <div className="sp-group__head">
              <h2>Leaderboard</h2>
            </div>
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => (
                  <tr key={i} style={row.is_self ? { background: 'var(--sp-accent-soft)' } : undefined}>
                    <td>{row.rank}</td>
                    <td>
                      {row.student_name}
                      {row.is_self ? ' (you)' : ''}
                    </td>
                    <td>
                      {row.score} / {row.max_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!r && reviewLoadFailed ? (
          <div className="sp-alert sp-alert--warn">
            Your attempt was submitted, but detailed review could not be loaded. Refresh this page or open the
            assessment again.
          </div>
        ) : null}

        {r?.resultsVisible && r?.questions ? (
          <div className="sp-stack">
            {r.questions.map((q: any, idx: number) => {
              const passage = q.passage_id
                ? reviewPassages.find((p: any) => p.id === q.passage_id)
                : null
              return (
                <div key={q.id} className="sp-card-plain" style={{ display: 'grid', gap: 12 }}>
                  <div className="sp-item__meta">
                    <span className="sp-chip">Q{idx + 1}</span>
                    {q.question_type ? <span className="sp-chip">{q.question_type}</span> : null}
                    {q.is_correct === true ? (
                      <span className="sp-badge sp-badge--ok">Correct</span>
                    ) : q.is_correct === false ? (
                      <span className="sp-badge sp-badge--danger">Incorrect</span>
                    ) : null}
                    {q.marks_awarded != null ? <span className="sp-chip">{q.marks_awarded} marks</span> : null}
                  </div>
                  {passage ? (
                    <div className="sp-card-plain" style={{ background: 'var(--sp-muted)', boxShadow: 'none' }}>
                      {passage.title ? (
                        <p className="sp-form__hint" style={{ marginTop: 0, fontWeight: 700 }}>
                          {passage.title}
                        </p>
                      ) : null}
                      <AssessmentRichContent content={passage.content} variant="passage" />
                    </div>
                  ) : null}
                  <AssessmentRichContent content={q.prompt} variant="prompt" />
                  {(q.media_urls || []).map((url: string) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={withBasePathHref(url)} alt="" style={{ maxWidth: '100%', height: 'auto', maxHeight: 192, borderRadius: 8, border: '1px solid var(--sp-border)' }} />
                  ))}
                  {q.question_type === 'numeric' ? (
                    <div style={{ fontSize: '0.875rem', display: 'grid', gap: 4 }}>
                      <p style={{ margin: 0 }}>
                        Your answer: <strong>{q.numeric_answer ?? '—'}</strong>
                      </p>
                      {q.correct_numeric != null ? (
                        <p style={{ margin: 0, color: 'var(--sp-success)' }}>Correct: {q.correct_numeric}</p>
                      ) : null}
                    </div>
                  ) : (
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
                      {(q.options || []).map((o: any) => {
                        const selected =
                          q.question_type === 'multiple_choice'
                            ? (q.selected_option_ids || []).includes(o.id)
                            : q.selected_option_id === o.id
                        const correct =
                          q.question_type === 'multiple_choice'
                            ? (q.correct_option_ids || []).includes(o.id)
                            : q.correct_option_id === o.id
                        return (
                          <li
                            key={o.id}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 10,
                              background: correct ? 'var(--sp-success-bg)' : selected ? 'var(--sp-danger-bg)' : 'var(--sp-muted)',
                              color: correct ? '#047857' : selected ? '#b91c1c' : 'inherit',
                              fontSize: '0.875rem',
                            }}
                          >
                            <span style={{ fontWeight: 600, marginRight: 8 }}>{o.id}.</span>
                            <AssessmentRichContent content={o.text} variant="option" className="inline" />
                            {o.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={withBasePathHref(o.imageUrl)} alt="" style={{ marginTop: 8, maxWidth: '100%', height: 'auto', maxHeight: 96, borderRadius: 8, border: '1px solid var(--sp-border)' }} />
                            ) : null}
                            {correct ? ' ✓' : selected ? ' (your answer)' : ''}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {q.explanation ? (
                    <AssessmentRichContent content={q.explanation} variant="explanation" />
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}

        {meta?.attemptsRemaining > 0 && meta?.assessment?.mode === 'practice' ? (
          <button
            type="button"
            onClick={() => {
              setReview(null)
              setAttempt(null)
              setLeaderboard(null)
              setReviewLoadFailed(false)
              setError('')
              void start()
            }}
            className="sp-btn sp-btn--primary sp-btn--sm"
            style={{ justifySelf: 'start' }}
          >
            Retake practice
          </button>
        ) : null}
        </div>
      </div>
    )
  }

  // In-progress attempt UI — focused exam shell (no portal chrome)
  if (attempt && attempt.status === 'in_progress' && current) {
    const qType = current.question_type || 'single_choice'
    const ans = answers[String(current.id)] || emptyAnswer()
    const numericStr = ans.numericAnswer != null ? String(ans.numericAnswer) : ''

    return (
      <div className="sp-exam-shell sp-exam-shell--focus">
        <header className="sp-exam-shell__top">
          <div className="sp-exam-shell__top-main">
            <p className="sp-exam-shell__kicker">Exam in progress</p>
            <h1 className="sp-exam-shell__title">{meta?.assessment?.title}</h1>
            <p className="sp-exam-shell__progress">
              Question {currentIdx + 1} of {questions.length}
              <span aria-hidden> · </span>
              {answeredCount}/{questions.length} answered
              {proctorWarnings > 0 ? (
                <>
                  <span aria-hidden> · </span>
                  Warnings: {proctorWarnings}
                </>
              ) : null}
            </p>
          </div>
          <div className="sp-exam-shell__top-actions">
            <div
              className={`sp-exam-timer${remainingMs != null && remainingMs < 60000 ? ' is-urgent' : ''}`}
              aria-live="polite"
            >
              {remainingMs != null ? formatRemaining(remainingMs) : '--:--'}
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit(false)}
              className="sp-btn sp-btn--primary sp-btn--sm"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </header>

        <div className="sp-exam-shell__body">
        {error ? (
          <div className="sp-alert sp-alert--error" role="alert">
            {error}
          </div>
        ) : null}

        {currentSection ? (
          <div className="sp-alert sp-alert--warn">
            <p style={{ margin: 0, fontWeight: 700 }}>{currentSection.title}</p>
            {currentSection.directions ? (
              <div style={{ marginTop: 8 }}>
                <AssessmentRichContent content={currentSection.directions} variant="directions" />
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: currentPassage ? 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' : '1fr',
          }}
        >
          {currentPassage ? (
            <div className="sp-card-plain" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <p className="sp-form__hint" style={{ marginTop: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {currentPassage.title || 'Passage'}
              </p>
              <AssessmentRichContent content={currentPassage.content} variant="passage" />
              {(currentPassage.media_urls || []).map((url: string) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={withBasePathHref(url)}
                  alt=""
                  style={{ marginTop: 12, width: '100%', maxHeight: 256, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--sp-border)' }}
                />
              ))}
            </div>
          ) : null}

          <div className="sp-card-plain">
            <div className="sp-item__meta" style={{ marginBottom: 10 }}>
              <span className="sp-chip">
                Question {currentIdx + 1} of {questions.length}
              </span>
              {current.marks != null ? <span className="sp-chip">{current.marks} marks</span> : null}
              {qType === 'multiple_choice' ? <span className="sp-chip">Select all that apply</span> : null}
              {qType === 'numeric' ? <span className="sp-chip">Enter a number</span> : null}
            </div>
            <AssessmentRichContent content={current.prompt} variant="prompt" />
            {(current.media_urls || []).map((url: string) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={withBasePathHref(url)}
                alt=""
                style={{ marginTop: 12, maxWidth: '100%', height: 'auto', maxHeight: 224, borderRadius: 8, border: '1px solid var(--sp-border)' }}
              />
            ))}

            {qType === 'numeric' ? (
              <div style={{ marginTop: 16 }}>
                <label className="sp-label">Your answer</label>
                <input
                  type="number"
                  step="any"
                  className="sp-input"
                  style={{ maxWidth: 280 }}
                  value={numericStr}
                  onChange={(e) => setNumeric(current.id, e.target.value)}
                  placeholder="Enter number"
                />
              </div>
            ) : (
              <div className="sp-stack" style={{ marginTop: 16 }}>
                {(current.options || []).map((o: any) => {
                  const selected =
                    qType === 'multiple_choice'
                      ? (ans.selectedOptionIds || []).includes(o.id)
                      : ans.selectedOptionId === o.id
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() =>
                        qType === 'multiple_choice'
                          ? toggleMulti(current.id, o.id)
                          : selectSingle(current.id, o.id)
                      }
                      className={`sp-option${selected ? ' is-selected' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontWeight: 600, flexShrink: 0 }}>
                          {qType === 'multiple_choice' ? (selected ? '☑' : '☐') : ''} {o.id}.
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <AssessmentRichContent content={o.text} variant="option" />
                          {o.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={withBasePathHref(o.imageUrl)}
                              alt=""
                              style={{ marginTop: 8, maxWidth: '100%', height: 'auto', maxHeight: 144, borderRadius: 8, border: '1px solid var(--sp-border)' }}
                            />
                          ) : null}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="sp-exam-palette">
          <p className="sp-exam-palette__label">Question palette</p>
          <div className="sp-qnav">
            {questions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIdx(i)}
                className={`sp-qnav__btn${
                  i === currentIdx
                    ? ' is-current'
                    : isAnswered(answers[String(q.id)], q.question_type || 'single_choice')
                      ? ' is-answered'
                      : ''
                }`}
                aria-label={`Question ${i + 1}`}
                aria-current={i === currentIdx ? 'true' : undefined}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="sp-exam-shell__nav">
          <button
            type="button"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            className="sp-btn sp-btn--ghost sp-btn--sm"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={currentIdx >= questions.length - 1}
            onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
            className="sp-btn sp-btn--ghost sp-btn--sm"
          >
            Next
          </button>
        </div>
        </div>
      </div>
    )
  }

  // Lobby / start screen (still outside portal sidebar)
  const a = meta?.assessment
  const mode = String(a?.mode || 'practice')
  const modeBadge =
    mode === 'live' ? 'sp-badge sp-badge--live' : mode === 'mock' ? 'sp-badge sp-badge--mock' : 'sp-badge sp-badge--practice'
  const modeLabel = mode === 'live' ? 'Live' : mode === 'mock' ? 'Mock' : 'Practice'

  return (
    <div className="sp-exam-shell">
      <header className="sp-exam-shell__top">
        <div>
          <p className="sp-exam-shell__kicker">Assessment lobby</p>
          <h1 className="sp-exam-shell__title">{a?.title || 'Assessment'}</h1>
        </div>
        <Link href={listHref} className="sp-btn sp-btn--ghost sp-btn--sm">
          Back to Quizzes
        </Link>
      </header>
      <div className="sp-exam-shell__body sp-page">
      <div className="sp-card-plain" style={{ display: 'grid', gap: 16, maxWidth: '42rem' }}>
        <div>
          <div className="sp-item__title-row" style={{ marginBottom: 8 }}>
            <span className={modeBadge}>{modeLabel}</span>
            {a?.is_free ? <span className="sp-badge sp-badge--free">Free</span> : null}
          </div>
          {a?.description ? <p className="sp-item__desc">{a.description}</p> : null}
        </div>
        {a?.directions ? (
          <div className="sp-card-plain" style={{ background: 'var(--sp-muted)', boxShadow: 'none' }}>
            <p className="sp-form__hint" style={{ marginTop: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Directions
            </p>
            <AssessmentRichContent content={a.directions} variant="directions" />
          </div>
        ) : null}
        {(meta?.sections || []).some((s: any) => s.directions) ? (
          <div className="sp-stack">
            <p className="sp-section-label">Section instructions</p>
            {(meta.sections || [])
              .filter((s: any) => s.directions)
              .map((s: any) => (
                <div key={s.id} className="sp-alert sp-alert--warn">
                  <p style={{ margin: 0, fontWeight: 700 }}>{s.title}</p>
                  <AssessmentRichContent content={s.directions} variant="directions" />
                </div>
              ))}
          </div>
        ) : null}
        <div className="sp-item__meta">
          <span className="sp-chip">{a?.duration_minutes} min</span>
          <span className="sp-chip">{meta?.questionCount} questions</span>
          <span className="sp-chip">{meta?.attemptsRemaining} attempts left</span>
          {(a?.marks_incorrect || 0) > 0 ? (
            <span className="sp-chip">−{a.marks_incorrect} per wrong</span>
          ) : null}
        </div>
        {mode === 'live' && a?.starts_at ? (
          <p className="sp-item__note">
            Window {new Date(a.starts_at).toLocaleString('en-IN')}
            {a.ends_at ? ` – ${new Date(a.ends_at).toLocaleString('en-IN')}` : ''}
            {!meta?.windowOpen ? ' (closed)' : ''}
          </p>
        ) : null}
        {error ? (
          <div className="sp-alert sp-alert--error" role="alert">
            {error}
          </div>
        ) : null}
        {meta?.inProgressAttemptId ? (
          <button
            type="button"
            onClick={async () => {
              await loadAttempt(centerId, meta.inProgressAttemptId)
              router.replace(`${examBase}?attemptId=${meta.inProgressAttemptId}`)
            }}
            className="sp-btn sp-btn--primary"
            style={{ justifySelf: 'start' }}
          >
            Continue in-progress attempt
          </button>
        ) : (
          <button
            type="button"
            disabled={starting || meta?.attemptsRemaining <= 0 || (a?.mode === 'live' && !meta?.windowOpen)}
            onClick={() => void start()}
            className="sp-btn sp-btn--primary"
            style={{ justifySelf: 'start' }}
          >
            {starting ? 'Starting…' : 'Start assessment'}
          </button>
        )}
        <p className="sp-form__hint" style={{ margin: 0 }}>
          Leaving the tab or switching windows during timed/live exams is recorded as a proctoring flag.
          Once you start, you will enter a focused exam view with no portal navigation.
        </p>
      </div>
      </div>
    </div>
  )
}
