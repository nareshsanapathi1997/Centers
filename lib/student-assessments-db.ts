import pool from './db'
import type { PoolClient } from '@/lib/db'
import {
  defaultTrueFalseOptions,
  isAssessmentQuestionType,
  normalizeOptions,
  numericAnswersMatch,
  parseMediaUrls,
  parseNumericAnswer,
  parseOptionIds,
  sameIdSet,
  sanitizeAssessmentHtml,
  validateQuestionInput,
  type AssessmentOption,
  type AssessmentQuestionType,
} from './assessment-content'

export { validateQuestionInput }

export type AssessmentMode = 'practice' | 'mock' | 'live'
export type ShowResults = 'immediate' | 'after_end' | 'never'
export type AttemptStatus = 'in_progress' | 'submitted' | 'expired'
export type { AssessmentOption as McqOption, AssessmentQuestionType }

export interface AssessmentRow {
  id: number
  center_id: number
  course_master_id: number
  batch_id: number | null
  mode: AssessmentMode
  title: string
  description: string | null
  directions: string | null
  duration_minutes: number
  max_attempts: number
  starts_at: string | null
  ends_at: string | null
  shuffle_questions: boolean
  shuffle_options: boolean
  show_results: ShowResults
  is_published: boolean
  is_free: boolean
  marks_correct: number
  marks_incorrect: number
  created_by: number | null
  created_at: string
  updated_at: string
  course_title?: string
  question_count?: number
  section_count?: number
}

export interface AssessmentSectionRow {
  id: number
  assessment_id: number
  title: string
  directions: string | null
  sort_order: number
  duration_minutes: number | null
}

export interface AssessmentPassageRow {
  id: number
  assessment_id: number
  section_id: number | null
  title: string | null
  content: string
  media_urls: string[]
  sort_order: number
}

export interface AssessmentQuestionRow {
  id: number
  assessment_id: number
  section_id: number | null
  passage_id: number | null
  question_type: AssessmentQuestionType
  prompt: string
  options: AssessmentOption[]
  correct_option_id: string | null
  correct_option_ids: string[] | null
  correct_numeric: number | null
  media_urls: string[]
  marks: number | null
  explanation: string | null
  sort_order: number
}

export interface AssessmentAttemptRow {
  id: number
  assessment_id: number
  student_id: number
  center_id: number
  status: AttemptStatus
  started_at: string
  ends_at: string
  submitted_at: string | null
  score: number | null
  max_score: number | null
  rank: number | null
  question_order: number[]
  option_orders: Record<string, string[]>
  proctor_event_count: number
}

export type StudentAnswerInput = {
  questionId: number
  selectedOptionId?: string | null
  selectedOptionIds?: string[] | null
  numericAnswer?: number | string | null
}

function parseJsonArray<T>(raw: unknown): T[] {
  if (!raw) return []
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T[]
    } catch {
      return []
    }
  }
  return raw as T[]
}

function parseJsonObject<T extends Record<string, unknown>>(raw: unknown): T {
  if (!raw) return {} as T
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T
    } catch {
      return {} as T
    }
  }
  return raw as T
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function mapQuestion(row: any): AssessmentQuestionRow {
  const questionType = (isAssessmentQuestionType(row.question_type)
    ? row.question_type
    : 'single_choice') as AssessmentQuestionType
  return {
    id: row.id,
    assessment_id: row.assessment_id,
    section_id: row.section_id ?? null,
    passage_id: row.passage_id ?? null,
    question_type: questionType,
    prompt: row.prompt,
    options: normalizeOptions(row.options),
    correct_option_id: row.correct_option_id ?? null,
    correct_option_ids: row.correct_option_ids != null ? parseOptionIds(row.correct_option_ids) : null,
    correct_numeric:
      row.correct_numeric != null && row.correct_numeric !== ''
        ? Number(row.correct_numeric)
        : null,
    media_urls: parseMediaUrls(row.media_urls),
    marks: row.marks != null ? Number(row.marks) : null,
    explanation: row.explanation ?? null,
    sort_order: row.sort_order,
  }
}

function mapPassage(row: any): AssessmentPassageRow {
  return {
    id: row.id,
    assessment_id: row.assessment_id,
    section_id: row.section_id ?? null,
    title: row.title ?? null,
    content: row.content || '',
    media_urls: parseMediaUrls(row.media_urls),
    sort_order: row.sort_order ?? 0,
  }
}

function mapSection(row: any): AssessmentSectionRow {
  return {
    id: row.id,
    assessment_id: row.assessment_id,
    title: row.title,
    directions: row.directions ?? null,
    sort_order: row.sort_order,
    duration_minutes: row.duration_minutes ?? null,
  }
}

export async function studentHasPaidCourse(
  studentId: number,
  centerId: number,
  courseMasterId: number
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1
     FROM student_fee_payments sfp
     WHERE sfp.center_id = $1
       AND sfp.course_master_id = $2
       AND sfp.status = 'completed'
       AND (sfp.student_id = $3 OR (
         sfp.student_id IS NULL AND sfp.student_mobile = (SELECT mobile FROM students WHERE id = $3)
       ))
     LIMIT 1`,
    [centerId, courseMasterId, studentId]
  )
  return result.rows.length > 0
}

/** Free assessments skip fee payment; paid ones require a completed payment for the course. */
export async function studentCanAccessAssessment(
  studentId: number,
  centerId: number,
  assessment: Pick<AssessmentRow, 'is_free' | 'course_master_id'>
): Promise<boolean> {
  if (assessment.is_free) return true
  return studentHasPaidCourse(studentId, centerId, assessment.course_master_id)
}

export async function listAdminAssessments(centerId: number): Promise<AssessmentRow[]> {
  const result = await pool.query(
    `SELECT a.*,
            cm.title AS course_title,
            (SELECT COUNT(*)::int FROM assessment_questions q WHERE q.assessment_id = a.id) AS question_count,
            (SELECT COUNT(*)::int FROM assessment_sections s WHERE s.assessment_id = a.id) AS section_count
     FROM assessments a
     LEFT JOIN course_masters cm ON cm.id = a.course_master_id
     WHERE a.center_id = $1
     ORDER BY a.updated_at DESC, a.id DESC`,
    [centerId]
  )
  return result.rows
}

export async function getAssessmentById(
  assessmentId: number,
  centerId?: number
): Promise<AssessmentRow | null> {
  const params: unknown[] = [assessmentId]
  let sql = `SELECT a.*, cm.title AS course_title
             FROM assessments a
             LEFT JOIN course_masters cm ON cm.id = a.course_master_id
             WHERE a.id = $1`
  if (centerId != null) {
    params.push(centerId)
    sql += ` AND a.center_id = $2`
  }
  const result = await pool.query(sql, params)
  return result.rows[0] || null
}

export async function createAssessment(input: {
  centerId: number
  courseMasterId: number
  batchId?: number | null
  mode: AssessmentMode
  title: string
  description?: string | null
  directions?: string | null
  durationMinutes: number
  maxAttempts: number
  startsAt?: string | null
  endsAt?: string | null
  shuffleQuestions?: boolean
  shuffleOptions?: boolean
  showResults?: ShowResults
  isPublished?: boolean
  isFree?: boolean
  marksCorrect?: number
  marksIncorrect?: number
  createdBy?: number | null
}): Promise<AssessmentRow> {
  const result = await pool.query(
    `INSERT INTO assessments (
       center_id, course_master_id, batch_id, mode, title, description, directions,
       duration_minutes, max_attempts, starts_at, ends_at,
       shuffle_questions, shuffle_options, show_results, is_published, is_free,
       marks_correct, marks_incorrect, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`,
    [
      input.centerId,
      input.courseMasterId,
      input.batchId ?? null,
      input.mode,
      input.title.trim(),
      input.description?.trim() || null,
      input.directions != null ? sanitizeAssessmentHtml(input.directions) || null : null,
      input.durationMinutes,
      input.maxAttempts,
      input.startsAt || null,
      input.endsAt || null,
      input.shuffleQuestions ?? false,
      input.shuffleOptions ?? false,
      input.showResults || 'immediate',
      input.isPublished ?? false,
      input.isFree ?? false,
      input.marksCorrect ?? 1,
      input.marksIncorrect ?? 0,
      input.createdBy ?? null,
    ]
  )
  return result.rows[0]
}

export async function updateAssessment(
  assessmentId: number,
  centerId: number,
  patch: Record<string, unknown>
): Promise<AssessmentRow | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let i = 1

  const set = (col: string, val: unknown) => {
    fields.push(`${col} = $${i++}`)
    values.push(val)
  }

  if (patch.courseMasterId != null) set('course_master_id', patch.courseMasterId)
  if (patch.batchId !== undefined) set('batch_id', patch.batchId)
  if (patch.mode != null) set('mode', patch.mode)
  if (typeof patch.title === 'string') set('title', patch.title.trim())
  if (patch.description !== undefined) {
    set('description', typeof patch.description === 'string' ? patch.description.trim() || null : null)
  }
  if (patch.directions !== undefined) {
    set(
      'directions',
      typeof patch.directions === 'string' ? sanitizeAssessmentHtml(patch.directions) || null : null
    )
  }
  if (patch.durationMinutes != null) set('duration_minutes', patch.durationMinutes)
  if (patch.maxAttempts != null) set('max_attempts', patch.maxAttempts)
  if (patch.startsAt !== undefined) set('starts_at', patch.startsAt || null)
  if (patch.endsAt !== undefined) set('ends_at', patch.endsAt || null)
  if (typeof patch.shuffleQuestions === 'boolean') set('shuffle_questions', patch.shuffleQuestions)
  if (typeof patch.shuffleOptions === 'boolean') set('shuffle_options', patch.shuffleOptions)
  if (patch.showResults != null) set('show_results', patch.showResults)
  if (typeof patch.isPublished === 'boolean') set('is_published', patch.isPublished)
  if (typeof patch.isFree === 'boolean') set('is_free', patch.isFree)
  if (patch.marksCorrect != null) set('marks_correct', patch.marksCorrect)
  if (patch.marksIncorrect != null) set('marks_incorrect', patch.marksIncorrect)

  if (fields.length === 0) {
    return getAssessmentById(assessmentId, centerId)
  }

  fields.push('updated_at = CURRENT_TIMESTAMP')
  values.push(assessmentId, centerId)

  const result = await pool.query(
    `UPDATE assessments SET ${fields.join(', ')}
     WHERE id = $${i++} AND center_id = $${i}
     RETURNING *`,
    values
  )
  return result.rows[0] || null
}

export async function deleteAssessment(assessmentId: number, centerId: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM assessments WHERE id = $1 AND center_id = $2 RETURNING id`,
    [assessmentId, centerId]
  )
  return result.rows.length > 0
}

export async function listSections(assessmentId: number): Promise<AssessmentSectionRow[]> {
  const result = await pool.query(
    `SELECT * FROM assessment_sections WHERE assessment_id = $1 ORDER BY sort_order ASC, id ASC`,
    [assessmentId]
  )
  return result.rows.map(mapSection)
}

export async function createSection(input: {
  assessmentId: number
  title: string
  directions?: string | null
  sortOrder?: number
  durationMinutes?: number | null
}): Promise<AssessmentSectionRow> {
  const result = await pool.query(
    `INSERT INTO assessment_sections (assessment_id, title, directions, sort_order, duration_minutes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      input.assessmentId,
      input.title.trim(),
      input.directions != null ? sanitizeAssessmentHtml(input.directions) || null : null,
      input.sortOrder ?? 0,
      input.durationMinutes ?? null,
    ]
  )
  return mapSection(result.rows[0])
}

export async function updateSection(
  sectionId: number,
  assessmentId: number,
  patch: {
    title?: string
    directions?: string | null
    sortOrder?: number
    durationMinutes?: number | null
  }
): Promise<AssessmentSectionRow | null> {
  const result = await pool.query(
    `UPDATE assessment_sections SET
       title = COALESCE($1, title),
       directions = CASE WHEN $2::boolean THEN $3 ELSE directions END,
       sort_order = COALESCE($4, sort_order),
       duration_minutes = CASE WHEN $5::boolean THEN $6 ELSE duration_minutes END
     WHERE id = $7 AND assessment_id = $8
     RETURNING *`,
    [
      patch.title?.trim() || null,
      patch.directions !== undefined,
      patch.directions != null ? sanitizeAssessmentHtml(patch.directions) || null : null,
      patch.sortOrder ?? null,
      patch.durationMinutes !== undefined,
      patch.durationMinutes ?? null,
      sectionId,
      assessmentId,
    ]
  )
  return result.rows[0] ? mapSection(result.rows[0]) : null
}

export async function deleteSection(sectionId: number, assessmentId: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM assessment_sections WHERE id = $1 AND assessment_id = $2 RETURNING id`,
    [sectionId, assessmentId]
  )
  return result.rows.length > 0
}

export async function listPassages(assessmentId: number): Promise<AssessmentPassageRow[]> {
  const result = await pool.query(
    `SELECT * FROM assessment_passages WHERE assessment_id = $1 ORDER BY sort_order ASC, id ASC`,
    [assessmentId]
  )
  return result.rows.map(mapPassage)
}

export async function createPassage(input: {
  assessmentId: number
  sectionId?: number | null
  title?: string | null
  content: string
  mediaUrls?: string[]
  sortOrder?: number
}): Promise<AssessmentPassageRow> {
  const result = await pool.query(
    `INSERT INTO assessment_passages (
       assessment_id, section_id, title, content, media_urls, sort_order
     ) VALUES ($1,$2,$3,$4,$5::jsonb,$6)
     RETURNING *`,
    [
      input.assessmentId,
      input.sectionId ?? null,
      input.title?.trim() || null,
      sanitizeAssessmentHtml(input.content),
      JSON.stringify(input.mediaUrls || []),
      input.sortOrder ?? 0,
    ]
  )
  return mapPassage(result.rows[0])
}

export async function updatePassage(
  passageId: number,
  assessmentId: number,
  patch: {
    sectionId?: number | null
    title?: string | null
    content?: string
    mediaUrls?: string[]
    sortOrder?: number
  }
): Promise<AssessmentPassageRow | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let i = 1

  if (patch.sectionId !== undefined) {
    fields.push(`section_id = $${i++}`)
    values.push(patch.sectionId)
  }
  if (patch.title !== undefined) {
    fields.push(`title = $${i++}`)
    values.push(typeof patch.title === 'string' ? patch.title.trim() || null : null)
  }
  if (typeof patch.content === 'string') {
    fields.push(`content = $${i++}`)
    values.push(sanitizeAssessmentHtml(patch.content))
  }
  if (patch.mediaUrls) {
    fields.push(`media_urls = $${i++}::jsonb`)
    values.push(JSON.stringify(patch.mediaUrls))
  }
  if (patch.sortOrder != null) {
    fields.push(`sort_order = $${i++}`)
    values.push(patch.sortOrder)
  }

  if (fields.length === 0) {
    const existing = await pool.query(
      `SELECT * FROM assessment_passages WHERE id = $1 AND assessment_id = $2`,
      [passageId, assessmentId]
    )
    return existing.rows[0] ? mapPassage(existing.rows[0]) : null
  }

  fields.push('updated_at = CURRENT_TIMESTAMP')
  values.push(passageId, assessmentId)
  const result = await pool.query(
    `UPDATE assessment_passages SET ${fields.join(', ')}
     WHERE id = $${i++} AND assessment_id = $${i}
     RETURNING *`,
    values
  )
  return result.rows[0] ? mapPassage(result.rows[0]) : null
}

export async function deletePassage(passageId: number, assessmentId: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM assessment_passages WHERE id = $1 AND assessment_id = $2 RETURNING id`,
    [passageId, assessmentId]
  )
  return result.rows.length > 0
}

export async function listQuestions(assessmentId: number): Promise<AssessmentQuestionRow[]> {
  const result = await pool.query(
    `SELECT * FROM assessment_questions WHERE assessment_id = $1 ORDER BY sort_order ASC, id ASC`,
    [assessmentId]
  )
  return result.rows.map(mapQuestion)
}

export type QuestionWriteInput = {
  assessmentId: number
  sectionId?: number | null
  passageId?: number | null
  questionType?: AssessmentQuestionType
  prompt: string
  options?: AssessmentOption[]
  correctOptionId?: string | null
  correctOptionIds?: string[] | null
  correctNumeric?: number | null
  mediaUrls?: string[]
  marks?: number | null
  explanation?: string | null
  sortOrder?: number
}

function prepareQuestionFields(input: QuestionWriteInput) {
  const questionType: AssessmentQuestionType = isAssessmentQuestionType(input.questionType)
    ? input.questionType
    : 'single_choice'

  let options = normalizeOptions(input.options || [])
  if (questionType === 'true_false' && options.length === 0) {
    options = defaultTrueFalseOptions()
  }
  if (questionType === 'numeric') {
    options = []
  }

  const correctOptionIds =
    questionType === 'multiple_choice'
      ? parseOptionIds(input.correctOptionIds || [])
      : null

  const correctOptionId =
    questionType === 'single_choice' || questionType === 'true_false'
      ? String(input.correctOptionId || '').trim() || null
      : questionType === 'multiple_choice' && correctOptionIds?.length
        ? correctOptionIds[0]
        : null

  const correctNumeric =
    questionType === 'numeric' ? parseNumericAnswer(input.correctNumeric) : null

  return {
    questionType,
    options,
    correctOptionId,
    correctOptionIds,
    correctNumeric,
    prompt: sanitizeAssessmentHtml(input.prompt),
    explanation:
      input.explanation != null ? sanitizeAssessmentHtml(input.explanation) || null : null,
    mediaUrls: (input.mediaUrls || []).filter((u) => typeof u === 'string' && u.trim()),
  }
}

export async function createQuestion(input: QuestionWriteInput): Promise<AssessmentQuestionRow> {
  const prepared = prepareQuestionFields(input)
  const result = await pool.query(
    `INSERT INTO assessment_questions (
       assessment_id, section_id, passage_id, question_type, prompt, options,
       correct_option_id, correct_option_ids, correct_numeric, media_urls,
       marks, explanation, sort_order
     ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8::jsonb,$9,$10::jsonb,$11,$12,$13)
     RETURNING *`,
    [
      input.assessmentId,
      input.sectionId ?? null,
      input.passageId ?? null,
      prepared.questionType,
      prepared.prompt,
      JSON.stringify(prepared.options),
      prepared.correctOptionId,
      prepared.correctOptionIds ? JSON.stringify(prepared.correctOptionIds) : null,
      prepared.correctNumeric,
      JSON.stringify(prepared.mediaUrls),
      input.marks ?? null,
      prepared.explanation,
      input.sortOrder ?? 0,
    ]
  )
  return mapQuestion(result.rows[0])
}

export async function updateQuestion(
  questionId: number,
  assessmentId: number,
  patch: Partial<QuestionWriteInput> & {
    sectionId?: number | null
    passageId?: number | null
  }
): Promise<AssessmentQuestionRow | null> {
  const existingRes = await pool.query(
    `SELECT * FROM assessment_questions WHERE id = $1 AND assessment_id = $2`,
    [questionId, assessmentId]
  )
  if (!existingRes.rows[0]) return null
  const existing = mapQuestion(existingRes.rows[0])

  const merged: QuestionWriteInput = {
    assessmentId,
    sectionId: patch.sectionId !== undefined ? patch.sectionId : existing.section_id,
    passageId: patch.passageId !== undefined ? patch.passageId : existing.passage_id,
    questionType: patch.questionType || existing.question_type,
    prompt: patch.prompt !== undefined ? patch.prompt : existing.prompt,
    options: patch.options !== undefined ? patch.options : existing.options,
    correctOptionId:
      patch.correctOptionId !== undefined ? patch.correctOptionId : existing.correct_option_id,
    correctOptionIds:
      patch.correctOptionIds !== undefined ? patch.correctOptionIds : existing.correct_option_ids,
    correctNumeric:
      patch.correctNumeric !== undefined ? patch.correctNumeric : existing.correct_numeric,
    mediaUrls: patch.mediaUrls !== undefined ? patch.mediaUrls : existing.media_urls,
    marks: patch.marks !== undefined ? patch.marks : existing.marks,
    explanation: patch.explanation !== undefined ? patch.explanation : existing.explanation,
    sortOrder: patch.sortOrder !== undefined ? patch.sortOrder : existing.sort_order,
  }

  const prepared = prepareQuestionFields(merged)
  const result = await pool.query(
    `UPDATE assessment_questions SET
       section_id = $1,
       passage_id = $2,
       question_type = $3,
       prompt = $4,
       options = $5::jsonb,
       correct_option_id = $6,
       correct_option_ids = $7::jsonb,
       correct_numeric = $8,
       media_urls = $9::jsonb,
       marks = $10,
       explanation = $11,
       sort_order = $12,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $13 AND assessment_id = $14
     RETURNING *`,
    [
      merged.sectionId ?? null,
      merged.passageId ?? null,
      prepared.questionType,
      prepared.prompt,
      JSON.stringify(prepared.options),
      prepared.correctOptionId,
      prepared.correctOptionIds ? JSON.stringify(prepared.correctOptionIds) : null,
      prepared.correctNumeric,
      JSON.stringify(prepared.mediaUrls),
      merged.marks ?? null,
      prepared.explanation,
      merged.sortOrder ?? 0,
      questionId,
      assessmentId,
    ]
  )
  return result.rows[0] ? mapQuestion(result.rows[0]) : null
}

export async function deleteQuestion(questionId: number, assessmentId: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM assessment_questions WHERE id = $1 AND assessment_id = $2 RETURNING id`,
    [questionId, assessmentId]
  )
  return result.rows.length > 0
}

/** @deprecated use validateQuestionInput */
export function validateMcqOptions(
  options: AssessmentOption[],
  correctOptionId: string
): string | null {
  return validateQuestionInput({
    questionType: 'single_choice',
    options,
    correctOptionId,
  })
}

function mapAttempt(row: any): AssessmentAttemptRow {
  return {
    ...row,
    score: row.score != null ? Number(row.score) : null,
    max_score: row.max_score != null ? Number(row.max_score) : null,
    question_order: parseJsonArray<number>(row.question_order),
    option_orders: parseJsonObject<Record<string, string[]>>(row.option_orders),
    proctor_event_count: Number(row.proctor_event_count || 0),
  }
}

export async function countStudentAttempts(
  assessmentId: number,
  studentId: number
): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS c FROM assessment_attempts
     WHERE assessment_id = $1 AND student_id = $2`,
    [assessmentId, studentId]
  )
  return result.rows[0]?.c || 0
}

export async function getInProgressAttempt(
  assessmentId: number,
  studentId: number
): Promise<AssessmentAttemptRow | null> {
  const result = await pool.query(
    `SELECT * FROM assessment_attempts
     WHERE assessment_id = $1 AND student_id = $2 AND status = 'in_progress'
     LIMIT 1`,
    [assessmentId, studentId]
  )
  return result.rows[0] ? mapAttempt(result.rows[0]) : null
}

export async function getAttemptById(attemptId: number): Promise<AssessmentAttemptRow | null> {
  const result = await pool.query(`SELECT * FROM assessment_attempts WHERE id = $1`, [attemptId])
  return result.rows[0] ? mapAttempt(result.rows[0]) : null
}

export function isLiveWindowOpen(assessment: AssessmentRow, now = new Date()): boolean {
  if (assessment.mode !== 'live') return true
  if (assessment.starts_at && now < new Date(assessment.starts_at)) return false
  if (assessment.ends_at && now > new Date(assessment.ends_at)) return false
  return true
}

export function canShowResults(assessment: AssessmentRow, now = new Date()): boolean {
  if (assessment.show_results === 'never') return false
  if (assessment.show_results === 'immediate') return true
  if (assessment.show_results === 'after_end') {
    // Honor ends_at for any mode that has a scheduled window (not live-only).
    if (assessment.ends_at) {
      return now >= new Date(assessment.ends_at)
    }
    // No scheduled end → results become visible once the attempt is finished.
    return true
  }
  return false
}

function gradeAnswer(
  question: AssessmentQuestionRow,
  answer: {
    selected_option_id?: string | null
    selected_option_ids?: unknown
    numeric_answer?: unknown
  } | null,
  marksCorrect: number,
  marksIncorrect: number
): { isCorrect: boolean | null; marksAwarded: number | null; answered: boolean } {
  const qMarks = question.marks != null ? Number(question.marks) : marksCorrect
  const penalty = -Math.abs(marksIncorrect)

  if (question.question_type === 'numeric') {
    const given = parseNumericAnswer(answer?.numeric_answer)
    if (given == null) return { isCorrect: null, marksAwarded: null, answered: false }
    const ok = numericAnswersMatch(given, question.correct_numeric)
    return { isCorrect: ok, marksAwarded: ok ? qMarks : penalty, answered: true }
  }

  if (question.question_type === 'multiple_choice') {
    const selected = parseOptionIds(
      answer?.selected_option_ids ??
        (answer?.selected_option_id ? [answer.selected_option_id] : [])
    )
    if (selected.length === 0) return { isCorrect: null, marksAwarded: null, answered: false }
    const expected = question.correct_option_ids || []
    const ok = sameIdSet(selected, expected)
    return { isCorrect: ok, marksAwarded: ok ? qMarks : penalty, answered: true }
  }

  const selected = answer?.selected_option_id || null
  if (!selected) return { isCorrect: null, marksAwarded: null, answered: false }
  const ok = selected === question.correct_option_id
  return { isCorrect: ok, marksAwarded: ok ? qMarks : penalty, answered: true }
}

export async function startAttempt(input: {
  assessment: AssessmentRow
  studentId: number
  centerId: number
}): Promise<{ attempt: AssessmentAttemptRow; error?: string; status?: number }> {
  const { assessment, studentId, centerId } = input
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const canAccess = await studentCanAccessAssessment(studentId, centerId, assessment)
    if (!canAccess) {
      await client.query('ROLLBACK')
      return { attempt: null as any, error: 'Assessment requires a completed fee payment for this course', status: 403 }
    }

    if (!assessment.is_published) {
      await client.query('ROLLBACK')
      return { attempt: null as any, error: 'Assessment is not published', status: 403 }
    }

    const now = new Date()
    if (assessment.mode === 'live' && !isLiveWindowOpen(assessment, now)) {
      await client.query('ROLLBACK')
      return { attempt: null as any, error: 'Live exam is not open right now', status: 403 }
    }

    let finalizedExpired = false
    const existing = await client.query(
      `SELECT * FROM assessment_attempts
       WHERE assessment_id = $1 AND student_id = $2 AND status = 'in_progress'
       LIMIT 1 FOR UPDATE`,
      [assessment.id, studentId]
    )
    if (existing.rows[0]) {
      const attempt = mapAttempt(existing.rows[0])
      if (now > new Date(attempt.ends_at)) {
        await finalizeAttemptWithClient(client, attempt.id, 'expired')
        finalizedExpired = true
      } else {
        await client.query('COMMIT')
        return { attempt }
      }
    }

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS c FROM assessment_attempts
       WHERE assessment_id = $1 AND student_id = $2`,
      [assessment.id, studentId]
    )
    const attemptCount = countRes.rows[0]?.c || 0
    if (attemptCount >= assessment.max_attempts) {
      if (finalizedExpired) await client.query('COMMIT')
      else await client.query('ROLLBACK')
      return { attempt: null as any, error: 'Maximum attempts reached', status: 403 }
    }

    const questionsRes = await client.query(
      `SELECT id, options, question_type FROM assessment_questions WHERE assessment_id = $1 ORDER BY sort_order ASC, id ASC`,
      [assessment.id]
    )
    if (questionsRes.rows.length === 0) {
      if (finalizedExpired) await client.query('COMMIT')
      else await client.query('ROLLBACK')
      return { attempt: null as any, error: 'Assessment has no questions', status: 400 }
    }

    let questionIds = questionsRes.rows.map((q) => q.id as number)
    if (assessment.shuffle_questions) {
      questionIds = shuffleInPlace([...questionIds])
    }

    const optionOrders: Record<string, string[]> = {}
    for (const q of questionsRes.rows) {
      const opts = normalizeOptions(q.options)
      let ids = opts.map((o) => o.id)
      if (assessment.shuffle_options && ids.length > 0 && q.question_type !== 'true_false') {
        ids = shuffleInPlace([...ids])
      }
      optionOrders[String(q.id)] = ids
    }

    let endsAt = new Date(now.getTime() + assessment.duration_minutes * 60 * 1000)
    if (assessment.mode === 'live' && assessment.ends_at) {
      const windowEnd = new Date(assessment.ends_at)
      if (windowEnd < endsAt) endsAt = windowEnd
    }

    const insert = await client.query(
      `INSERT INTO assessment_attempts (
         assessment_id, student_id, center_id, status, started_at, ends_at,
         question_order, option_orders
       ) VALUES ($1,$2,$3,'in_progress',$4,$5,$6::jsonb,$7::jsonb)
       RETURNING *`,
      [
        assessment.id,
        studentId,
        centerId,
        now.toISOString(),
        endsAt.toISOString(),
        JSON.stringify(questionIds),
        JSON.stringify(optionOrders),
      ]
    )

    await client.query('COMMIT')
    return { attempt: mapAttempt(insert.rows[0]) }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function finalizeAttemptWithClient(
  client: PoolClient,
  attemptId: number,
  status: 'submitted' | 'expired'
): Promise<AssessmentAttemptRow> {
  const attemptRes = await client.query(
    `SELECT * FROM assessment_attempts WHERE id = $1 FOR UPDATE`,
    [attemptId]
  )
  const attempt = attemptRes.rows[0]
  if (!attempt) throw new Error('Attempt not found')
  if (attempt.status !== 'in_progress') return mapAttempt(attempt)

  const assessmentRes = await client.query(`SELECT * FROM assessments WHERE id = $1`, [
    attempt.assessment_id,
  ])
  const assessment = assessmentRes.rows[0] as AssessmentRow

  const questionsRes = await client.query(
    `SELECT * FROM assessment_questions WHERE assessment_id = $1`,
    [attempt.assessment_id]
  )
  const answersRes = await client.query(
    `SELECT * FROM assessment_answers WHERE attempt_id = $1`,
    [attemptId]
  )
  const answerByQ = new Map(answersRes.rows.map((a) => [a.question_id, a]))

  let score = 0
  let maxScore = 0
  const marksCorrect = Number(assessment.marks_correct ?? 1)
  const marksIncorrect = Number(assessment.marks_incorrect ?? 0)

  for (const raw of questionsRes.rows) {
    const q = mapQuestion(raw)
    const qMarks = q.marks != null ? Number(q.marks) : marksCorrect
    maxScore += qMarks
    const ans = answerByQ.get(q.id) || null
    const graded = gradeAnswer(q, ans, marksCorrect, marksIncorrect)
    if (graded.answered && graded.marksAwarded != null) {
      score += graded.marksAwarded
    }
    await client.query(
      `INSERT INTO assessment_answers (
         attempt_id, question_id, selected_option_id, selected_option_ids, numeric_answer,
         is_correct, marks_awarded, updated_at
       )
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,CURRENT_TIMESTAMP)
       ON CONFLICT (attempt_id, question_id) DO UPDATE SET
         is_correct = EXCLUDED.is_correct,
         marks_awarded = EXCLUDED.marks_awarded,
         updated_at = CURRENT_TIMESTAMP`,
      [
        attemptId,
        q.id,
        ans?.selected_option_id ?? null,
        ans?.selected_option_ids != null
          ? JSON.stringify(parseOptionIds(ans.selected_option_ids))
          : null,
        ans?.numeric_answer != null ? Number(ans.numeric_answer) : null,
        graded.isCorrect,
        graded.answered ? graded.marksAwarded : null,
      ]
    )
  }

  // Negative marking can overshoot; floor at zero for reported score.
  const finalScore = Math.max(0, score)
  const submittedAt = new Date().toISOString()
  const updated = await client.query(
    `UPDATE assessment_attempts SET
       status = $1,
       submitted_at = $2,
       score = $3,
       max_score = $4,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING *`,
    [status, submittedAt, finalScore, maxScore, attemptId]
  )

  if (assessment.mode === 'live') {
    await recomputeRanksWithClient(client, assessment.id)
  }

  return mapAttempt(updated.rows[0])
}

async function recomputeRanksWithClient(client: PoolClient, assessmentId: number) {
  await client.query(
    `UPDATE assessment_attempts a
     JOIN (
       SELECT id,
              RANK() OVER (ORDER BY score DESC NULLS LAST, submitted_at ASC NULLS LAST) AS r
       FROM assessment_attempts
       WHERE assessment_id = $1 AND status IN ('submitted', 'expired') AND score IS NOT NULL
     ) ranked ON ranked.id = a.id
     SET a."rank" = ranked.r`,
    [assessmentId]
  )
}

export async function finalizeAttempt(
  attemptId: number,
  status: 'submitted' | 'expired' = 'submitted'
): Promise<AssessmentAttemptRow> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const attempt = await finalizeAttemptWithClient(client, attemptId, status)
    await client.query('COMMIT')
    return attempt
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function ensureAttemptNotTimedOut(
  attempt: AssessmentAttemptRow
): Promise<AssessmentAttemptRow> {
  if (attempt.status !== 'in_progress') return attempt
  if (new Date() <= new Date(attempt.ends_at)) return attempt
  return finalizeAttempt(attempt.id, 'expired')
}

export async function saveAnswers(
  attemptId: number,
  answers: StudentAnswerInput[]
): Promise<{ ok: boolean; error?: string; status?: number; attempt?: AssessmentAttemptRow }> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const attemptRes = await client.query(
      `SELECT * FROM assessment_attempts WHERE id = $1 FOR UPDATE`,
      [attemptId]
    )
    if (!attemptRes.rows[0]) {
      await client.query('ROLLBACK')
      return { ok: false, error: 'Attempt not found', status: 404 }
    }
    let attempt = mapAttempt(attemptRes.rows[0])
    if (attempt.status !== 'in_progress') {
      await client.query('ROLLBACK')
      return { ok: false, error: 'Attempt is locked', status: 403 }
    }
    if (new Date() > new Date(attempt.ends_at)) {
      attempt = await finalizeAttemptWithClient(client, attemptId, 'expired')
      await client.query('COMMIT')
      return { ok: false, error: 'Time expired; attempt finalized', status: 403, attempt }
    }

    const questionsRes = await client.query(
      `SELECT id, question_type FROM assessment_questions WHERE assessment_id = $1`,
      [attempt.assessment_id]
    )
    const typeById = new Map(
      questionsRes.rows.map((q) => [q.id as number, String(q.question_type || 'single_choice')])
    )

    const qIds = new Set(attempt.question_order)
    for (const ans of answers) {
      if (!qIds.has(ans.questionId)) continue
      const qType = typeById.get(ans.questionId) || 'single_choice'

      let selectedOptionId: string | null = null
      let selectedOptionIds: string[] | null = null
      let numericAnswer: number | null = null

      if (qType === 'numeric') {
        numericAnswer = parseNumericAnswer(ans.numericAnswer)
      } else if (qType === 'multiple_choice') {
        selectedOptionIds = parseOptionIds(ans.selectedOptionIds || [])
        selectedOptionId = selectedOptionIds[0] || null
        if (selectedOptionIds.length === 0) {
          selectedOptionIds = null
          selectedOptionId = null
        }
      } else {
        selectedOptionId =
          ans.selectedOptionId !== undefined && ans.selectedOptionId !== null
            ? String(ans.selectedOptionId)
            : null
        if (selectedOptionId === '') selectedOptionId = null
      }

      await client.query(
        `INSERT INTO assessment_answers (
           attempt_id, question_id, selected_option_id, selected_option_ids, numeric_answer, updated_at
         )
         VALUES ($1, $2, $3, $4::jsonb, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (attempt_id, question_id) DO UPDATE SET
           selected_option_id = EXCLUDED.selected_option_id,
           selected_option_ids = EXCLUDED.selected_option_ids,
           numeric_answer = EXCLUDED.numeric_answer,
           updated_at = CURRENT_TIMESTAMP`,
        [
          attemptId,
          ans.questionId,
          selectedOptionId,
          selectedOptionIds ? JSON.stringify(selectedOptionIds) : null,
          numericAnswer,
        ]
      )
    }

    await client.query(
      `UPDATE assessment_attempts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [attemptId]
    )
    await client.query('COMMIT')
    return { ok: true, attempt }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function submitAttempt(attemptId: number): Promise<{
  attempt?: AssessmentAttemptRow
  error?: string
  status?: number
}> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const attemptRes = await client.query(
      `SELECT * FROM assessment_attempts WHERE id = $1 FOR UPDATE`,
      [attemptId]
    )
    if (!attemptRes.rows[0]) {
      await client.query('ROLLBACK')
      return { error: 'Attempt not found', status: 404 }
    }
    const attempt = mapAttempt(attemptRes.rows[0])
    if (attempt.status !== 'in_progress') {
      await client.query('COMMIT')
      return { attempt }
    }
    const status: 'submitted' | 'expired' =
      new Date() > new Date(attempt.ends_at) ? 'expired' : 'submitted'
    const finalized = await finalizeAttemptWithClient(client, attemptId, status)
    await client.query('COMMIT')
    return { attempt: finalized }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/** Events that increment the student-facing warning counter (others are logged only). */
const COUNTED_PROCTOR_EVENTS = new Set([
  'visibility_hidden',
  'fullscreen_exit',
  'copy',
  'paste',
  'contextmenu',
])

export async function recordProctorEvent(
  attemptId: number,
  eventType: string,
  meta?: Record<string, unknown> | null
): Promise<{ ok: boolean; error?: string; status?: number; count?: number }> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const attemptRes = await client.query(
      `SELECT * FROM assessment_attempts WHERE id = $1 FOR UPDATE`,
      [attemptId]
    )
    if (!attemptRes.rows[0]) {
      await client.query('ROLLBACK')
      return { ok: false, error: 'Attempt not found', status: 404 }
    }
    if (attemptRes.rows[0].status !== 'in_progress') {
      await client.query('ROLLBACK')
      return { ok: false, error: 'Attempt is locked', status: 403 }
    }
    await client.query(
      `INSERT INTO assessment_proctor_events (attempt_id, event_type, meta)
       VALUES ($1, $2, $3::jsonb)`,
      [attemptId, eventType, meta ? JSON.stringify(meta) : null]
    )
    let count = Number(attemptRes.rows[0].proctor_event_count || 0)
    if (COUNTED_PROCTOR_EVENTS.has(eventType)) {
      const updated = await client.query(
        `UPDATE assessment_attempts
         SET proctor_event_count = proctor_event_count + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING proctor_event_count`,
        [attemptId]
      )
      count = Number(updated.rows[0].proctor_event_count)
    }
    await client.query('COMMIT')
    return { ok: true, count }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getAttemptAnswers(attemptId: number) {
  const result = await pool.query(
    `SELECT * FROM assessment_answers WHERE attempt_id = $1`,
    [attemptId]
  )
  return result.rows.map((row) => ({
    ...row,
    selected_option_ids:
      row.selected_option_ids != null ? parseOptionIds(row.selected_option_ids) : null,
    numeric_answer:
      row.numeric_answer != null && row.numeric_answer !== ''
        ? Number(row.numeric_answer)
        : null,
  }))
}

export function buildStudentQuestionsPayload(
  questions: AssessmentQuestionRow[],
  attempt: AssessmentAttemptRow,
  includeCorrect: boolean
) {
  const byId = new Map(questions.map((q) => [q.id, q]))
  const ordered = attempt.question_order
    .map((id) => byId.get(id))
    .filter(Boolean) as AssessmentQuestionRow[]

  return ordered.map((q) => {
    const optOrder = attempt.option_orders[String(q.id)] || q.options.map((o) => o.id)
    const optById = new Map(q.options.map((o) => [o.id, o]))
    const options = optOrder
      .map((id) => optById.get(id))
      .filter(Boolean)
      .map((o) => ({
        id: o!.id,
        text: o!.text,
        imageUrl: o!.imageUrl || null,
      }))

    return {
      id: q.id,
      section_id: q.section_id,
      passage_id: q.passage_id,
      question_type: q.question_type,
      prompt: q.prompt,
      options,
      media_urls: q.media_urls,
      marks: q.marks,
      sort_order: q.sort_order,
      ...(includeCorrect
        ? {
            correct_option_id: q.correct_option_id,
            correct_option_ids: q.correct_option_ids,
            correct_numeric: q.correct_numeric,
            explanation: q.explanation,
          }
        : {}),
    }
  })
}

export function buildStudentAnswerMap(
  answers: Array<{
    question_id: number
    selected_option_id?: string | null
    selected_option_ids?: string[] | null
    numeric_answer?: number | null
  }>
) {
  const map: Record<
    string,
    {
      selectedOptionId: string | null
      selectedOptionIds: string[] | null
      numericAnswer: number | null
    }
  > = {}
  for (const a of answers) {
    map[String(a.question_id)] = {
      selectedOptionId: a.selected_option_id ?? null,
      selectedOptionIds: a.selected_option_ids ?? null,
      numericAnswer: a.numeric_answer ?? null,
    }
  }
  return map
}

export async function listStudentAssessments(studentId: number, centerId: number) {
  const result = await pool.query(
    `SELECT a.*,
            cm.title AS course_title,
            (SELECT COUNT(*)::int FROM assessment_questions q WHERE q.assessment_id = a.id) AS question_count,
            (SELECT COUNT(*)::int FROM assessment_attempts att
              WHERE att.assessment_id = a.id AND att.student_id = $2) AS attempt_count,
            (SELECT att2.id FROM assessment_attempts att2
              WHERE att2.assessment_id = a.id AND att2.student_id = $2 AND att2.status = 'in_progress'
              LIMIT 1) AS in_progress_attempt_id,
            (SELECT att3.score FROM assessment_attempts att3
              WHERE att3.assessment_id = a.id AND att3.student_id = $2
                AND att3.status IN ('submitted','expired')
              ORDER BY att3.submitted_at DESC NULLS LAST
              LIMIT 1) AS latest_score,
            (SELECT att3.max_score FROM assessment_attempts att3
              WHERE att3.assessment_id = a.id AND att3.student_id = $2
                AND att3.status IN ('submitted','expired')
              ORDER BY att3.submitted_at DESC NULLS LAST
              LIMIT 1) AS latest_max_score
     FROM assessments a
     JOIN course_masters cm ON cm.id = a.course_master_id
     WHERE a.center_id = $1 AND a.is_published = true
       AND (
         a.is_free = true
         OR a.course_master_id IN (
           SELECT DISTINCT sfp.course_master_id
           FROM student_fee_payments sfp
           WHERE sfp.center_id = $1 AND sfp.status = 'completed'
             AND (sfp.student_id = $2 OR (
               sfp.student_id IS NULL AND sfp.student_mobile = (SELECT mobile FROM students WHERE id = $2)
             ))
         )
       )
     ORDER BY
       CASE a.mode WHEN 'live' THEN 0 WHEN 'mock' THEN 1 ELSE 2 END,
       a.starts_at NULLS LAST,
       a.updated_at DESC`,
    [centerId, studentId]
  )
  return result.rows
}

export async function listAttemptSummaries(assessmentId: number, centerId: number) {
  const result = await pool.query(
    `SELECT att.*,
            s.full_name AS student_name,
            s.mobile AS student_mobile,
            s.regno AS student_regno
     FROM assessment_attempts att
     JOIN students s ON s.id = att.student_id
     JOIN assessments a ON a.id = att.assessment_id
     WHERE att.assessment_id = $1 AND a.center_id = $2
     ORDER BY att.started_at DESC`,
    [assessmentId, centerId]
  )
  return result.rows.map((row) => ({
    ...mapAttempt(row),
    student_name: row.student_name,
    student_mobile: row.student_mobile,
    student_regno: row.student_regno,
  }))
}

export async function getLeaderboard(assessmentId: number, limit = 50) {
  const result = await pool.query(
    `SELECT att.id, att.student_id, att.score, att.max_score, att."rank", att.submitted_at,
            att.proctor_event_count, s.full_name AS student_name
     FROM assessment_attempts att
     JOIN students s ON s.id = att.student_id
     WHERE att.assessment_id = $1
       AND att.status IN ('submitted', 'expired')
       AND att.score IS NOT NULL
     ORDER BY att.score DESC NULLS LAST, att.submitted_at ASC NULLS LAST
     LIMIT $2`,
    [assessmentId, limit]
  )
  return result.rows.map((row, idx) => ({
    ...row,
    score: row.score != null ? Number(row.score) : null,
    max_score: row.max_score != null ? Number(row.max_score) : null,
    display_rank: row.rank ?? idx + 1,
  }))
}

export async function getReviewPayload(attemptId: number) {
  const attempt = await getAttemptById(attemptId)
  if (!attempt) return null
  const assessment = await getAssessmentById(attempt.assessment_id)
  if (!assessment) return null
  const [questions, answers, sections, passages] = await Promise.all([
    listQuestions(attempt.assessment_id),
    getAttemptAnswers(attemptId),
    listSections(attempt.assessment_id),
    listPassages(attempt.assessment_id),
  ])
  const includeCorrect = canShowResults(assessment)
  const answerMap = new Map(answers.map((a) => [a.question_id, a]))

  return {
    assessment: {
      id: assessment.id,
      title: assessment.title,
      mode: assessment.mode,
      directions: assessment.directions,
      show_results: assessment.show_results,
      marks_correct: Number(assessment.marks_correct),
      marks_incorrect: Number(assessment.marks_incorrect),
    },
    attempt: {
      id: attempt.id,
      status: attempt.status,
      score: includeCorrect ? attempt.score : null,
      max_score: includeCorrect ? attempt.max_score : null,
      rank: includeCorrect && assessment.mode === 'live' ? attempt.rank : null,
      started_at: attempt.started_at,
      ends_at: attempt.ends_at,
      submitted_at: attempt.submitted_at,
      proctor_event_count: attempt.proctor_event_count,
    },
    sections,
    passages,
    questions: buildStudentQuestionsPayload(questions, attempt, includeCorrect).map((q) => {
      const ans = answerMap.get(q.id)
      return {
        ...q,
        selected_option_id: ans?.selected_option_id ?? null,
        selected_option_ids: ans?.selected_option_ids ?? null,
        numeric_answer: ans?.numeric_answer ?? null,
        is_correct: includeCorrect ? ans?.is_correct ?? null : null,
        marks_awarded: includeCorrect
          ? ans?.marks_awarded != null
            ? Number(ans.marks_awarded)
            : null
          : null,
      }
    }),
    resultsVisible: includeCorrect,
  }
}
