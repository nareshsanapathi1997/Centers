import { describe, expect, it } from 'vitest'
import {
  numericAnswersMatch,
  parseNumericAnswer,
  sameIdSet,
  validateQuestionInput,
} from '@/lib/assessment-content'

describe('assessment advanced scoring helpers', () => {
  it('matches numeric answers exactly', () => {
    expect(numericAnswersMatch(42, 42)).toBe(true)
    expect(numericAnswersMatch(42.0, 42)).toBe(true)
    expect(numericAnswersMatch(41, 42)).toBe(false)
    expect(numericAnswersMatch(null, 42)).toBe(false)
  })

  it('parses numeric answers', () => {
    expect(parseNumericAnswer('12.5')).toBe(12.5)
    expect(parseNumericAnswer('')).toBeNull()
    expect(parseNumericAnswer('abc')).toBeNull()
  })

  it('compares multi-select sets all-or-nothing', () => {
    expect(sameIdSet(['A', 'C'], ['C', 'A'])).toBe(true)
    expect(sameIdSet(['A', 'C'], ['A'])).toBe(false)
  })

  it('validates question types', () => {
    expect(
      validateQuestionInput({
        questionType: 'single_choice',
        options: [
          { id: 'A', text: '1' },
          { id: 'B', text: '2' },
        ],
        correctOptionId: 'A',
      })
    ).toBeNull()

    expect(
      validateQuestionInput({
        questionType: 'multiple_choice',
        options: [
          { id: 'A', text: '1' },
          { id: 'B', text: '2' },
        ],
        correctOptionIds: ['A', 'B'],
      })
    ).toBeNull()

    expect(
      validateQuestionInput({
        questionType: 'numeric',
        correctNumeric: 7,
      })
    ).toBeNull()

    expect(
      validateQuestionInput({
        questionType: 'true_false',
        correctOptionId: 'true',
      })
    ).toBeNull()
  })
})
