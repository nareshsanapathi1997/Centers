import { sanitizeCmsHtml } from '@/lib/sanitize-html'

export type AssessmentQuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'numeric'

export const ASSESSMENT_QUESTION_TYPES: AssessmentQuestionType[] = [
  'single_choice',
  'multiple_choice',
  'true_false',
  'numeric',
]

export type AssessmentOption = {
  id: string
  text: string
  imageUrl?: string | null
}

export function isAssessmentQuestionType(value: unknown): value is AssessmentQuestionType {
  return (
    typeof value === 'string' &&
    (ASSESSMENT_QUESTION_TYPES as string[]).includes(value)
  )
}

/** Sanitize authored HTML (prompts, passages, directions, explanations). */
export function sanitizeAssessmentHtml(html: string | null | undefined): string {
  return sanitizeCmsHtml(html)
}

export function parseMediaUrls(raw: unknown): string[] {
  if (!raw) return []
  let arr: unknown[] = []
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw)
    } catch {
      return []
    }
  } else if (Array.isArray(raw)) {
    arr = raw
  }
  return arr.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
}

export function parseOptionIds(raw: unknown): string[] {
  if (!raw) return []
  let arr: unknown[] = []
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw)
    } catch {
      return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    }
  } else if (Array.isArray(raw)) {
    arr = raw
  }
  return arr.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
}

export function normalizeOptions(raw: unknown): AssessmentOption[] {
  if (!raw) return []
  let arr: unknown = raw
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(arr)) return []
  return arr
    .map((o: any) => ({
      id: String(o?.id ?? '').trim(),
      text: String(o?.text ?? ''),
      imageUrl: o?.imageUrl ? String(o.imageUrl) : o?.image_url ? String(o.image_url) : null,
    }))
    .filter((o) => o.id)
}

export function defaultTrueFalseOptions(): AssessmentOption[] {
  return [
    { id: 'true', text: 'True' },
    { id: 'false', text: 'False' },
  ]
}

export function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].map(String).sort()
  const sb = [...b].map(String).sort()
  return sa.every((v, i) => v === sb[i])
}

export function parseNumericAnswer(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isFinite(n)) return null
  return n
}

export function numericAnswersMatch(given: number | null, expected: number | null): boolean {
  if (given == null || expected == null) return false
  // Exact match for v1 (compare as numbers; tolerate tiny float noise)
  return Math.abs(given - expected) < 1e-9
}

export function validateQuestionInput(input: {
  questionType: AssessmentQuestionType
  options?: AssessmentOption[]
  correctOptionId?: string | null
  correctOptionIds?: string[] | null
  correctNumeric?: number | null
  prompt?: string
}): string | null {
  if (!isAssessmentQuestionType(input.questionType)) {
    return 'Invalid question_type'
  }

  if (input.questionType === 'numeric') {
    if (parseNumericAnswer(input.correctNumeric) == null) {
      return 'correct_numeric is required for numeric questions'
    }
    return null
  }

  let options = normalizeOptions(input.options || [])
  if (input.questionType === 'true_false') {
    if (options.length === 0) options = defaultTrueFalseOptions()
    if (options.length !== 2) return 'True/False questions need exactly 2 options'
    const correct = String(input.correctOptionId || '').trim()
    if (!options.some((o) => o.id === correct)) {
      return 'correct_option_id must be true or false'
    }
    return null
  }

  if (options.length < 2 || options.length > 6) {
    return 'Questions must have 2–6 options'
  }
  const ids = new Set<string>()
  for (const opt of options) {
    if (!opt?.id?.trim()) return 'Each option needs an id'
    if (!opt.text?.trim() && !opt.imageUrl) return 'Each option needs text or an image'
    if (ids.has(opt.id)) return 'Option ids must be unique'
    ids.add(opt.id)
  }

  if (input.questionType === 'multiple_choice') {
    const correctIds = parseOptionIds(input.correctOptionIds || [])
    if (correctIds.length === 0) return 'Select at least one correct option'
    if (!correctIds.every((id) => ids.has(id))) {
      return 'correct_option_ids must match option ids'
    }
    return null
  }

  const correctOptionId = String(input.correctOptionId || '').trim()
  if (!ids.has(correctOptionId)) return 'correct_option_id must match one option'
  return null
}
