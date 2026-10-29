'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { authenticatedFetch } from '@/lib/admin-api'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminPageSpinner from '@/components/admin/AdminPageSpinner'
import AdminButton from '@/components/admin/AdminButton'
import AdminFormField from '@/components/admin/AdminFormField'
import FormModal from '@/components/admin/FormModal'
import ImageUpload from '@/components/admin/ImageUpload'
import AssessmentRichContent from '@/components/assessments/AssessmentRichContent'
import PageHeader from '@/components/ui/PageHeader'
import ErrorState from '@/components/ui/ErrorState'
import { ArrowLeft, Plus, Trash2, Pencil } from 'lucide-react'
import { confirmDialog } from '@/lib/admin-ui-store'

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

function toLocalInput(value: string | null | undefined) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Convert datetime-local value to ISO so server parsing keeps the admin's local intent. */
function fromLocalInput(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

type OptionDraft = { id: string; text: string; imageUrl?: string }
type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'numeric'

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Single choice',
  multiple_choice: 'Multi-select',
  true_false: 'True / False',
  numeric: 'Numeric',
}

const emptyQuestion = () => ({
  questionType: 'single_choice' as QuestionType,
  prompt: '',
  sectionId: '',
  passageId: '',
  marks: '',
  explanation: '',
  correctOptionId: 'A',
  correctOptionIds: ['A'] as string[],
  correctNumeric: '',
  mediaUrls: [] as string[],
  options: [
    { id: 'A', text: '', imageUrl: '' },
    { id: 'B', text: '', imageUrl: '' },
    { id: 'C', text: '', imageUrl: '' },
    { id: 'D', text: '', imageUrl: '' },
  ] as OptionDraft[],
})

const emptyPassage = () => ({
  title: '',
  content: '',
  sectionId: '',
  mediaUrl: '',
})

export default function AssessmentDetailPage({
  params,
}: {
  params: { centerId: string; assessmentId: string }
}) {
  const centerId = params.centerId
  const assessmentId = params.assessmentId
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'attempts' ? 'attempts' : 'editor'

  const [tab, setTab] = useState<'editor' | 'attempts' | 'leaderboard'>(initialTab as any)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [assessment, setAssessment] = useState<any>(null)
  const [sections, setSections] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  const [passages, setPassages] = useState<any[]>([])
  const [attempts, setAttempts] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])

  const [meta, setMeta] = useState<any>({})
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [editQuestionId, setEditQuestionId] = useState<number | null>(null)
  const [qForm, setQForm] = useState(emptyQuestion())
  const [qError, setQError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const [sectionTitle, setSectionTitle] = useState('')
  const [sectionDuration, setSectionDuration] = useState('')
  const [sectionDirections, setSectionDirections] = useState('')
  const [editSectionId, setEditSectionId] = useState<number | null>(null)
  const [editSectionForm, setEditSectionForm] = useState({ title: '', directions: '', durationMinutes: '' })

  const [showPassageForm, setShowPassageForm] = useState(false)
  const [editPassageId, setEditPassageId] = useState<number | null>(null)
  const [pForm, setPForm] = useState(emptyPassage())
  const [pError, setPError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authenticatedFetch(
        `/api/admin/assessments/${assessmentId}?centerId=${centerId}`,
        { headers: authHeaders() }
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to load')
        return
      }
      setAssessment(data.assessment)
      setSections(data.sections || [])
      setQuestions(data.questions || [])
      setPassages(data.passages || [])
      setMeta({
        title: data.assessment.title || '',
        description: data.assessment.description || '',
        directions: data.assessment.directions || '',
        mode: data.assessment.mode,
        durationMinutes: String(data.assessment.duration_minutes ?? 60),
        maxAttempts: String(data.assessment.max_attempts ?? 1),
        startsAt: toLocalInput(data.assessment.starts_at),
        endsAt: toLocalInput(data.assessment.ends_at),
        shuffleQuestions: Boolean(data.assessment.shuffle_questions),
        shuffleOptions: Boolean(data.assessment.shuffle_options),
        showResults: data.assessment.show_results || 'immediate',
        isPublished: Boolean(data.assessment.is_published),
        isFree: Boolean(data.assessment.is_free),
        marksCorrect: String(data.assessment.marks_correct ?? 1),
        marksIncorrect: String(data.assessment.marks_incorrect ?? 0),
      })
    } finally {
      setLoading(false)
    }
  }, [assessmentId, centerId])

  const loadAttempts = useCallback(async () => {
    const res = await authenticatedFetch(
      `/api/admin/assessments/${assessmentId}/attempts?centerId=${centerId}`,
      { headers: authHeaders() }
    )
    if (res.ok) {
      const data = await res.json()
      setAttempts(data.attempts || [])
    }
  }, [assessmentId, centerId])

  const loadLeaderboard = useCallback(async () => {
    const res = await authenticatedFetch(
      `/api/admin/assessments/${assessmentId}/leaderboard?centerId=${centerId}`,
      { headers: authHeaders() }
    )
    if (res.ok) {
      const data = await res.json()
      setLeaderboard(data.leaderboard || [])
    }
  }, [assessmentId, centerId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (tab === 'attempts') loadAttempts()
    if (tab === 'leaderboard') loadLeaderboard()
  }, [tab, loadAttempts, loadLeaderboard])

  const saveMeta = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await authenticatedFetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          centerId: parseInt(centerId, 10),
          title: meta.title,
          description: meta.description,
          directions: meta.directions,
          mode: meta.mode,
          durationMinutes: parseInt(meta.durationMinutes, 10) || 60,
          maxAttempts: parseInt(meta.maxAttempts, 10) || 1,
          startsAt: fromLocalInput(meta.startsAt),
          endsAt: fromLocalInput(meta.endsAt),
          shuffleQuestions: meta.shuffleQuestions,
          shuffleOptions: meta.shuffleOptions,
          showResults: meta.showResults,
          isPublished: meta.isPublished,
          isFree: meta.isFree,
          marksCorrect: Number(meta.marksCorrect) || 1,
          marksIncorrect: Number(meta.marksIncorrect) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save')
        return
      }
      setAssessment(data.assessment)
    } finally {
      setSaving(false)
    }
  }

  const addSection = async () => {
    if (!sectionTitle.trim()) return
    const res = await authenticatedFetch(`/api/admin/assessments/${assessmentId}/sections`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        centerId: parseInt(centerId, 10),
        title: sectionTitle,
        directions: sectionDirections,
        durationMinutes: sectionDuration ? parseInt(sectionDuration, 10) : null,
        sortOrder: sections.length,
      }),
    })
    if (res.ok) {
      setSectionTitle('')
      setSectionDuration('')
      setSectionDirections('')
      load()
    }
  }

  const openEditSection = (s: any) => {
    setEditSectionId(s.id)
    setEditSectionForm({
      title: s.title || '',
      directions: s.directions || '',
      durationMinutes: s.duration_minutes != null ? String(s.duration_minutes) : '',
    })
  }

  const saveSection = async () => {
    if (!editSectionId) return
    const res = await authenticatedFetch(`/api/admin/assessments/${assessmentId}/sections`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        centerId: parseInt(centerId, 10),
        sectionId: editSectionId,
        title: editSectionForm.title,
        directions: editSectionForm.directions,
        durationMinutes: editSectionForm.durationMinutes
          ? parseInt(editSectionForm.durationMinutes, 10)
          : null,
      }),
    })
    if (res.ok) {
      setEditSectionId(null)
      load()
    }
  }

  const deleteSection = async (sectionId: number) => {
    if (!(await confirmDialog({ message: 'Delete this section?', destructive: true }))) return
    await authenticatedFetch(
      `/api/admin/assessments/${assessmentId}/sections?centerId=${centerId}&sectionId=${sectionId}`,
      { method: 'DELETE', headers: authHeaders() }
    )
    load()
  }

  const openCreatePassage = () => {
    setEditPassageId(null)
    setPForm(emptyPassage())
    setPError('')
    setShowPassageForm(true)
  }

  const openEditPassage = (p: any) => {
    setEditPassageId(p.id)
    setPForm({
      title: p.title || '',
      content: p.content || '',
      sectionId: p.section_id ? String(p.section_id) : '',
      mediaUrl: (p.media_urls || [])[0] || '',
    })
    setPError('')
    setShowPassageForm(true)
  }

  const savePassage = async () => {
    setPError('')
    if (!pForm.content.trim() && !pForm.title.trim()) {
      setPError('Title or content is required')
      return
    }
    const payload = {
      centerId: parseInt(centerId, 10),
      title: pForm.title,
      content: pForm.content,
      sectionId: pForm.sectionId ? parseInt(pForm.sectionId, 10) : null,
      mediaUrls: pForm.mediaUrl ? [pForm.mediaUrl] : [],
      // Only set order on create — edits must preserve existing sort_order.
      ...(editPassageId ? {} : { sortOrder: passages.length }),
    }
    const res = await authenticatedFetch(`/api/admin/assessments/${assessmentId}/passages`, {
      method: editPassageId ? 'PUT' : 'POST',
      headers: authHeaders(),
      body: JSON.stringify(editPassageId ? { ...payload, passageId: editPassageId } : payload),
    })
    const data = await res.json()
    if (!res.ok) {
      setPError(data.error || 'Failed to save passage')
      return
    }
    setShowPassageForm(false)
    load()
  }

  const deletePassage = async (passageId: number) => {
    if (!(await confirmDialog({ message: 'Delete this passage?', destructive: true }))) return
    await authenticatedFetch(
      `/api/admin/assessments/${assessmentId}/passages?centerId=${centerId}&passageId=${passageId}`,
      { method: 'DELETE', headers: authHeaders() }
    )
    load()
  }

  const openCreateQuestion = () => {
    setEditQuestionId(null)
    setQForm(emptyQuestion())
    setQError('')
    setShowPreview(false)
    setShowQuestionForm(true)
  }

  const openEditQuestion = (q: any) => {
    setEditQuestionId(q.id)
    const qType = (q.question_type || 'single_choice') as QuestionType
    setQForm({
      questionType: qType,
      prompt: q.prompt,
      sectionId: q.section_id ? String(q.section_id) : '',
      passageId: q.passage_id ? String(q.passage_id) : '',
      marks: q.marks != null ? String(q.marks) : '',
      explanation: q.explanation || '',
      correctOptionId: q.correct_option_id || 'A',
      correctOptionIds: q.correct_option_ids?.length
        ? q.correct_option_ids
        : q.correct_option_id
          ? [q.correct_option_id]
          : [],
      correctNumeric: q.correct_numeric != null ? String(q.correct_numeric) : '',
      mediaUrls: q.media_urls || [],
      options: (q.options || []).length
        ? q.options.map((o: any) => ({ id: o.id, text: o.text || '', imageUrl: o.imageUrl || '' }))
        : emptyQuestion().options,
    })
    setQError('')
    setShowPreview(false)
    setShowQuestionForm(true)
  }

  const setQuestionType = (questionType: QuestionType) => {
    if (questionType === 'true_false') {
      setQForm((prev) => ({
        ...prev,
        questionType,
        options: [
          { id: 'true', text: 'True', imageUrl: '' },
          { id: 'false', text: 'False', imageUrl: '' },
        ],
        correctOptionId: prev.correctOptionId === 'false' ? 'false' : 'true',
        correctOptionIds: [],
      }))
      return
    }
    if (questionType === 'numeric') {
      setQForm((prev) => ({ ...prev, questionType, options: [], correctOptionIds: [] }))
      return
    }
    setQForm((prev) => ({
      ...prev,
      questionType,
      options:
        prev.options.length >= 2
          ? prev.options
          : emptyQuestion().options,
      correctOptionId: prev.correctOptionId || 'A',
      correctOptionIds: prev.correctOptionIds.length ? prev.correctOptionIds : ['A'],
    }))
  }

  const saveQuestion = async () => {
    setQError('')
    const options =
      qForm.questionType === 'numeric'
        ? []
        : qForm.options
            .filter((o) => o.text.trim() || o.imageUrl)
            .map((o) => ({
              id: o.id,
              text: o.text,
              imageUrl: o.imageUrl || null,
            }))

    const payload = {
      centerId: parseInt(centerId, 10),
      questionType: qForm.questionType,
      prompt: qForm.prompt,
      sectionId: qForm.sectionId ? parseInt(qForm.sectionId, 10) : null,
      passageId: qForm.passageId ? parseInt(qForm.passageId, 10) : null,
      marks: qForm.marks !== '' ? Number(qForm.marks) : null,
      explanation: qForm.explanation,
      correctOptionId: qForm.correctOptionId,
      correctOptionIds: qForm.correctOptionIds,
      correctNumeric: qForm.correctNumeric !== '' ? Number(qForm.correctNumeric) : null,
      mediaUrls: qForm.mediaUrls.filter(Boolean),
      options,
      // Only set order on create — edits must preserve existing sort_order.
      ...(editQuestionId ? {} : { sortOrder: questions.length }),
    }
    const res = await authenticatedFetch(`/api/admin/assessments/${assessmentId}/questions`, {
      method: editQuestionId ? 'PUT' : 'POST',
      headers: authHeaders(),
      body: JSON.stringify(editQuestionId ? { ...payload, questionId: editQuestionId } : payload),
    })
    const data = await res.json()
    if (!res.ok) {
      setQError(data.error || 'Failed to save question')
      return
    }
    setShowQuestionForm(false)
    load()
  }

  const deleteQuestion = async (questionId: number) => {
    if (!(await confirmDialog({ message: 'Delete this question?', destructive: true }))) return
    await authenticatedFetch(
      `/api/admin/assessments/${assessmentId}/questions?centerId=${centerId}&questionId=${questionId}`,
      { method: 'DELETE', headers: authHeaders() }
    )
    load()
  }

  const sectionName = useMemo(() => {
    const map = new Map(sections.map((s) => [s.id, s.title]))
    return (id: number | null) => (id ? map.get(id) || 'Section' : 'General')
  }, [sections])

  const passageName = useMemo(() => {
    const map = new Map(passages.map((p) => [p.id, p.title || `Passage #${p.id}`]))
    return (id: number | null) => (id ? map.get(id) || 'Passage' : null)
  }, [passages])

  if (loading) return <AdminPageSpinner />
  if (!assessment) {
    return (
      <AdminPageShell>
        <ErrorState
          error={error || 'Assessment not found'}
          onRetry={() => void load()}
        />
        <Link href={`/admin/${centerId}/assessments`} className="mt-4 inline-flex text-primary hover:underline">
          ← Back to assessments
        </Link>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell>
    <div className="space-y-6">
      <PageHeader
        title={assessment.title}
        description={`${assessment.course_title} · ${assessment.mode}`}
        breadcrumbs={[
          { label: 'Admin', href: `/admin/${centerId}` },
          { label: 'Assessments', href: `/admin/${centerId}/assessments` },
          { label: assessment.title },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {(['editor', 'attempts', 'leaderboard'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  tab === t
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
                }`}
              >
                {t === 'editor' ? 'Editor' : t === 'attempts' ? 'Attempts' : 'Leaderboard'}
              </button>
            ))}
          </div>
        }
      />
      <Link href={`/admin/${centerId}/assessments`} className="inline-flex w-fit items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="w-4 h-4" /> All assessments
      </Link>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {tab === 'editor' && (
        <div className="space-y-6">
          <div className="admin-card p-5 space-y-4">
            <h2 className="font-semibold text-lg">Settings</h2>
            <AdminFormField label="Title">
              <input className="admin-form-control" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
            </AdminFormField>
            <AdminFormField label="Description">
              <textarea className="admin-form-control" rows={2} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
            </AdminFormField>
            <AdminFormField
              label="Assessment directions (HTML / $math$)"
              hint="Shown before the exam starts. Supports HTML tables/images and KaTeX $...$ / $$...$$."
            >
              <textarea
                className="admin-form-control font-mono text-sm"
                rows={3}
                value={meta.directions}
                onChange={(e) => setMeta({ ...meta, directions: e.target.value })}
                placeholder="General instructions for candidates…"
              />
            </AdminFormField>
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Mode">
                <select className="admin-form-control" value={meta.mode} onChange={(e) => setMeta({ ...meta, mode: e.target.value })}>
                  <option value="practice">Practice</option>
                  <option value="mock">Mock</option>
                  <option value="live">Live</option>
                </select>
              </AdminFormField>
              <AdminFormField label="Show results">
                <select className="admin-form-control" value={meta.showResults} onChange={(e) => setMeta({ ...meta, showResults: e.target.value })}>
                  <option value="immediate">Immediate</option>
                  <option value="after_end">After end</option>
                  <option value="never">Never</option>
                </select>
              </AdminFormField>
            </div>
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Duration (minutes)">
                <input type="number" className="admin-form-control" value={meta.durationMinutes} onChange={(e) => setMeta({ ...meta, durationMinutes: e.target.value })} />
              </AdminFormField>
              <AdminFormField label="Max attempts">
                <input type="number" className="admin-form-control" value={meta.maxAttempts} onChange={(e) => setMeta({ ...meta, maxAttempts: e.target.value })} />
              </AdminFormField>
            </div>
            {meta.mode === 'live' && (
              <div className="admin-form-row admin-form-row--2">
                <AdminFormField label="Starts at">
                  <input type="datetime-local" className="admin-form-control" value={meta.startsAt} onChange={(e) => setMeta({ ...meta, startsAt: e.target.value })} />
                </AdminFormField>
                <AdminFormField label="Ends at">
                  <input type="datetime-local" className="admin-form-control" value={meta.endsAt} onChange={(e) => setMeta({ ...meta, endsAt: e.target.value })} />
                </AdminFormField>
              </div>
            )}
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Marks correct">
                <input type="number" step="0.5" className="admin-form-control" value={meta.marksCorrect} onChange={(e) => setMeta({ ...meta, marksCorrect: e.target.value })} />
              </AdminFormField>
              <AdminFormField label="Marks incorrect">
                <input type="number" step="0.25" className="admin-form-control" value={meta.marksIncorrect} onChange={(e) => setMeta({ ...meta, marksIncorrect: e.target.value })} />
              </AdminFormField>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={meta.shuffleQuestions} onChange={(e) => setMeta({ ...meta, shuffleQuestions: e.target.checked })} />
                Shuffle questions
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={meta.shuffleOptions} onChange={(e) => setMeta({ ...meta, shuffleOptions: e.target.checked })} />
                Shuffle options
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={meta.isPublished} onChange={(e) => setMeta({ ...meta, isPublished: e.target.checked })} />
                Published
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={Boolean(meta.isFree)} onChange={(e) => setMeta({ ...meta, isFree: e.target.checked })} />
                Free for all registered students
              </label>
            </div>
            <AdminButton onClick={saveMeta} disabled={saving}>
              {saving ? 'Saving…' : 'Save settings'}
            </AdminButton>
          </div>

          <div className="admin-card p-5 space-y-4">
            <h2 className="font-semibold text-lg">Sections</h2>
            <p className="text-sm text-gray-500">
              Sections are first-class for mock/live (and optional for practice). Add directions shown before that section’s questions.
            </p>
            <div className="space-y-2">
              <input
                className="admin-form-control"
                placeholder="Section title"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
              />
              <textarea
                className="admin-form-control font-mono text-sm"
                rows={2}
                placeholder="Section directions (HTML / $math$) — optional"
                value={sectionDirections}
                onChange={(e) => setSectionDirections(e.target.value)}
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="admin-form-control sm:w-40"
                  type="number"
                  placeholder="Minutes (opt.)"
                  value={sectionDuration}
                  onChange={(e) => setSectionDuration(e.target.value)}
                />
                <AdminButton onClick={addSection} icon={<Plus className="w-4 h-4" />}>Add section</AdminButton>
              </div>
            </div>
            {sections.length === 0 ? (
              <p className="text-sm text-gray-500">No sections yet (optional).</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {sections.map((s) => (
                  <li key={s.id} className="py-3 space-y-2">
                    {editSectionId === s.id ? (
                      <div className="space-y-2">
                        <input
                          className="admin-form-control"
                          value={editSectionForm.title}
                          onChange={(e) => setEditSectionForm({ ...editSectionForm, title: e.target.value })}
                        />
                        <textarea
                          className="admin-form-control font-mono text-sm"
                          rows={2}
                          value={editSectionForm.directions}
                          onChange={(e) => setEditSectionForm({ ...editSectionForm, directions: e.target.value })}
                        />
                        <input
                          className="admin-form-control sm:w-40"
                          type="number"
                          placeholder="Minutes"
                          value={editSectionForm.durationMinutes}
                          onChange={(e) => setEditSectionForm({ ...editSectionForm, durationMinutes: e.target.value })}
                        />
                        <div className="flex gap-2">
                          <AdminButton onClick={saveSection}>Save</AdminButton>
                          <AdminButton variant="secondary" onClick={() => setEditSectionId(null)}>Cancel</AdminButton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{s.title}</p>
                          <p className="text-xs text-gray-500">
                            Order {s.sort_order}
                            {s.duration_minutes != null ? ` · ${s.duration_minutes} min` : ''}
                          </p>
                          {s.directions ? (
                            <div className="mt-2 text-sm border-l-2 border-amber-300 pl-3">
                              <AssessmentRichContent content={s.directions} variant="directions" />
                            </div>
                          ) : null}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button type="button" className="text-indigo-600 text-sm" onClick={() => openEditSection(s)}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" className="text-red-600 text-sm" onClick={() => deleteSection(s.id)}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="admin-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-lg">Passages / comprehension</h2>
                <p className="text-sm text-gray-500">Create a reading passage, then attach multiple questions to it.</p>
              </div>
              <AdminButton onClick={openCreatePassage} icon={<Plus className="w-4 h-4" />}>
                Add passage
              </AdminButton>
            </div>
            {passages.length === 0 ? (
              <p className="text-sm text-gray-500">No passages yet.</p>
            ) : (
              <div className="space-y-3">
                {passages.map((p) => (
                  <div key={p.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 mb-1">
                          {p.title || `Passage #${p.id}`}
                          {p.section_id ? ` · ${sectionName(p.section_id)}` : ''}
                        </p>
                        <AssessmentRichContent content={p.content} variant="passage" />
                        {(p.media_urls || []).map((url: string) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={url} src={url} alt="" className="mt-2 max-h-40 rounded border" />
                        ))}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => openEditPassage(p)} className="text-indigo-600 text-sm">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => deletePassage(p.id)} className="text-red-600 text-sm">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="admin-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-lg">Questions ({questions.length})</h2>
              <AdminButton onClick={openCreateQuestion} icon={<Plus className="w-4 h-4" />}>
                Add question
              </AdminButton>
            </div>
            <p className="text-sm text-gray-500">
              Types: single choice, multi-select (all-or-nothing), true/false, numeric. Prompt supports HTML + KaTeX.
            </p>
            {questions.length === 0 ? (
              <p className="text-sm text-gray-500">No questions yet.</p>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 mb-1">
                          Q{idx + 1} · {TYPE_LABELS[(q.question_type || 'single_choice') as QuestionType] || q.question_type}
                          {' · '}{sectionName(q.section_id)}
                          {q.passage_id ? ` · ${passageName(q.passage_id)}` : ''}
                          {q.marks != null ? ` · ${q.marks} marks` : ''}
                        </p>
                        <AssessmentRichContent content={q.prompt} variant="prompt" />
                        {(q.media_urls || []).map((url: string) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={url} src={url} alt="" className="mt-2 max-h-32 rounded border" />
                        ))}
                        {q.question_type === 'numeric' ? (
                          <p className="mt-2 text-sm text-green-700">Answer: {q.correct_numeric}</p>
                        ) : (
                          <ul className="mt-2 text-sm text-gray-600 space-y-1">
                            {(q.options || []).map((o: any) => {
                              const correct =
                                q.question_type === 'multiple_choice'
                                  ? (q.correct_option_ids || []).includes(o.id)
                                  : o.id === q.correct_option_id
                              return (
                                <li key={o.id} className={correct ? 'text-green-700 font-medium' : ''}>
                                  {o.id}. {o.text || '(image)'}
                                  {correct ? ' ✓' : ''}
                                  {o.imageUrl ? ' [img]' : ''}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => openEditQuestion(q)} className="text-indigo-600 text-sm inline-flex items-center gap-1">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button type="button" onClick={() => deleteQuestion(q.id)} className="text-red-600 text-sm inline-flex items-center gap-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'attempts' && (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Rank</th>
                  <th>Proctor flags</th>
                  <th>Started</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {attempts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-500 py-8">No attempts yet.</td>
                  </tr>
                ) : (
                  attempts.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div>{a.student_name}</div>
                        <div className="text-xs text-gray-500">{a.student_mobile}</div>
                      </td>
                      <td>{a.status}</td>
                      <td>{a.score != null ? `${a.score} / ${a.max_score ?? '—'}` : '—'}</td>
                      <td>{a.rank ?? '—'}</td>
                      <td>{a.proctor_event_count ?? 0}</td>
                      <td className="text-sm">{a.started_at ? new Date(a.started_at).toLocaleString() : '—'}</td>
                      <td className="text-sm">{a.submitted_at ? new Date(a.submitted_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Score</th>
                  <th>Submitted</th>
                  <th>Proctor flags</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-500 py-8">No ranked attempts yet.</td>
                  </tr>
                ) : (
                  leaderboard.map((row) => (
                    <tr key={row.id}>
                      <td>{row.display_rank ?? row.rank}</td>
                      <td>{row.student_name}</td>
                      <td>{row.score} / {row.max_score}</td>
                      <td className="text-sm">{row.submitted_at ? new Date(row.submitted_at).toLocaleString() : '—'}</td>
                      <td>{row.proctor_event_count ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <FormModal
        isOpen={showPassageForm}
        onClose={() => setShowPassageForm(false)}
        title={editPassageId ? 'Edit passage' : 'Add passage'}
        formError={pError}
        footer={
          <div className="admin-btn-group admin-btn-group--end admin-modal__footer-actions">
            <AdminButton variant="secondary" onClick={() => setShowPassageForm(false)}>Cancel</AdminButton>
            <AdminButton onClick={savePassage}>{editPassageId ? 'Update' : 'Add'}</AdminButton>
          </div>
        }
      >
        <AdminFormField label="Title">
          <input className="admin-form-control" value={pForm.title} onChange={(e) => setPForm({ ...pForm, title: e.target.value })} />
        </AdminFormField>
        {sections.length > 0 && (
          <AdminFormField label="Section">
            <select className="admin-form-control" value={pForm.sectionId} onChange={(e) => setPForm({ ...pForm, sectionId: e.target.value })}>
              <option value="">None</option>
              {sections.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.title}</option>
              ))}
            </select>
          </AdminFormField>
        )}
        <AdminFormField
          label="Passage content *"
          hint="HTML allowed (tables, <p>, <img>). Use $x^2$ or $$\\frac{a}{b}$$ for math."
          required
        >
          <textarea
            className="admin-form-control font-mono text-sm"
            rows={8}
            value={pForm.content}
            onChange={(e) => setPForm({ ...pForm, content: e.target.value })}
          />
        </AdminFormField>
        <ImageUpload
          label="Passage diagram / image (optional)"
          value={pForm.mediaUrl}
          onChange={(url) => setPForm({ ...pForm, mediaUrl: url })}
          folder="assessments"
          centerId={centerId}
        />
        {pForm.content ? (
          <div className="border rounded-lg p-3 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2">Preview</p>
            <AssessmentRichContent content={pForm.content} variant="passage" />
          </div>
        ) : null}
      </FormModal>

      <FormModal
        isOpen={showQuestionForm}
        onClose={() => setShowQuestionForm(false)}
        title={editQuestionId ? 'Edit question' : 'Add question'}
        formError={qError}
        footer={
          <div className="admin-btn-group admin-btn-group--end admin-modal__footer-actions">
            <AdminButton variant="secondary" onClick={() => setShowQuestionForm(false)}>Cancel</AdminButton>
            <AdminButton onClick={saveQuestion}>{editQuestionId ? 'Update' : 'Add'}</AdminButton>
          </div>
        }
      >
        <AdminFormField label="Question type">
          <select
            className="admin-form-control"
            value={qForm.questionType}
            onChange={(e) => setQuestionType(e.target.value as QuestionType)}
          >
            {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </AdminFormField>

        <AdminFormField
          label="Prompt *"
          hint="HTML + KaTeX. Example: Solve $x^2-4=0$ or paste an HTML table."
          required
        >
          <textarea
            className="admin-form-control font-mono text-sm"
            rows={4}
            value={qForm.prompt}
            onChange={(e) => setQForm({ ...qForm, prompt: e.target.value })}
          />
        </AdminFormField>

        <div className="flex items-center gap-3">
          <button type="button" className="text-sm text-indigo-600" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? 'Hide preview' : 'Show math/HTML preview'}
          </button>
        </div>
        {showPreview ? (
          <div className="border rounded-lg p-3 bg-gray-50">
            <AssessmentRichContent content={qForm.prompt} variant="prompt" />
          </div>
        ) : null}

        <ImageUpload
          label="Stem image / diagram (optional)"
          value={qForm.mediaUrls[0] || ''}
          onChange={(url) => setQForm({ ...qForm, mediaUrls: url ? [url] : [] })}
          folder="assessments"
          centerId={centerId}
        />

        {sections.length > 0 && (
          <AdminFormField label="Section">
            <select className="admin-form-control" value={qForm.sectionId} onChange={(e) => setQForm({ ...qForm, sectionId: e.target.value })}>
              <option value="">None</option>
              {sections.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.title}</option>
              ))}
            </select>
          </AdminFormField>
        )}

        {passages.length > 0 && (
          <AdminFormField label="Attach passage">
            <select className="admin-form-control" value={qForm.passageId} onChange={(e) => setQForm({ ...qForm, passageId: e.target.value })}>
              <option value="">None</option>
              {passages.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.title || `Passage #${p.id}`}</option>
              ))}
            </select>
          </AdminFormField>
        )}

        {qForm.questionType === 'numeric' ? (
          <AdminFormField label="Correct numeric answer *" required>
            <input
              type="number"
              step="any"
              className="admin-form-control"
              value={qForm.correctNumeric}
              onChange={(e) => setQForm({ ...qForm, correctNumeric: e.target.value })}
            />
          </AdminFormField>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              Options {qForm.questionType === 'multiple_choice' ? '(select all correct)' : '(mark correct)'}
            </p>
            {qForm.options.map((opt, idx) => (
              <div key={opt.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {qForm.questionType === 'multiple_choice' ? (
                    <input
                      type="checkbox"
                      checked={qForm.correctOptionIds.includes(opt.id)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...qForm.correctOptionIds, opt.id]
                          : qForm.correctOptionIds.filter((id) => id !== opt.id)
                        setQForm({ ...qForm, correctOptionIds: next })
                      }}
                    />
                  ) : (
                    <input
                      type="radio"
                      name="correct"
                      checked={qForm.correctOptionId === opt.id}
                      onChange={() => setQForm({ ...qForm, correctOptionId: opt.id })}
                      title="Mark correct"
                    />
                  )}
                  <span className="w-12 text-sm font-medium">{opt.id}</span>
                  <input
                    className="admin-form-control"
                    value={opt.text}
                    onChange={(e) => {
                      const options = [...qForm.options]
                      options[idx] = { ...opt, text: e.target.value }
                      setQForm({ ...qForm, options })
                    }}
                    placeholder={`Option ${opt.id} (text or $math$)`}
                    disabled={qForm.questionType === 'true_false'}
                  />
                  {qForm.questionType !== 'true_false' && qForm.options.length > 2 && (
                    <button
                      type="button"
                      className="text-red-600 text-sm"
                      onClick={() => {
                        const options = qForm.options.filter((_, i) => i !== idx)
                        const correctOptionId = options.some((o) => o.id === qForm.correctOptionId)
                          ? qForm.correctOptionId
                          : options[0]?.id || 'A'
                        setQForm({
                          ...qForm,
                          options,
                          correctOptionId,
                          correctOptionIds: qForm.correctOptionIds.filter((id) => options.some((o) => o.id === id)),
                        })
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
                {qForm.questionType !== 'true_false' && (
                  <ImageUpload
                    label={`Option ${opt.id} image (optional)`}
                    value={opt.imageUrl || ''}
                    onChange={(url) => {
                      const options = [...qForm.options]
                      options[idx] = { ...opt, imageUrl: url }
                      setQForm({ ...qForm, options })
                    }}
                    folder="assessments"
                    centerId={centerId}
                  />
                )}
              </div>
            ))}
            {qForm.questionType !== 'true_false' && qForm.options.length < 6 && (
              <button
                type="button"
                className="text-sm text-indigo-600"
                onClick={() => {
                  const nextId = String.fromCharCode(65 + qForm.options.length)
                  setQForm({
                    ...qForm,
                    options: [...qForm.options, { id: nextId, text: '', imageUrl: '' }],
                  })
                }}
              >
                + Add option
              </button>
            )}
          </div>
        )}

        <div className="admin-form-row admin-form-row--2">
          <AdminFormField label="Marks (optional override)">
            <input className="admin-form-control" type="number" step="0.5" value={qForm.marks} onChange={(e) => setQForm({ ...qForm, marks: e.target.value })} />
          </AdminFormField>
          <AdminFormField label="Explanation (optional, HTML/$math$)">
            <input className="admin-form-control" value={qForm.explanation} onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })} />
          </AdminFormField>
        </div>
      </FormModal>
    </div>
    </AdminPageShell>
  )
}
