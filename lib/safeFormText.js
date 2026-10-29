/**
 * Client-side checks for public forms: block markup/script patterns while
 * allowing person names: Unicode letters, spaces, and only . ' -
 */

/** Letters (any script) + combining marks + minimal punctuation for names */
export const PERSON_NAME_MAX_LENGTH = 40

export const PERSON_NAME_REGEX = /^[ \p{L}\p{M}'.-]+$/u

export const PERSON_NAME_INVALID_MESSAGE =
  'Use only letters, spaces, period, hyphen, and apostrophe (no numbers or other symbols).'

export const PERSON_NAME_TOO_LONG_MESSAGE = `Name cannot exceed ${PERSON_NAME_MAX_LENGTH} characters.`

export const PLAIN_TEXT_UNSAFE_MESSAGE =
  'This field cannot contain HTML tags, angle brackets, or script-like content.'

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isValidPersonName(value) {
  if (value == null || typeof value !== 'string') return false
  const s = value.trim()
  if (s.length < 2 || s.length > PERSON_NAME_MAX_LENGTH) return false
  return PERSON_NAME_REGEX.test(s)
}

/** C0 controls except tab, LF, CR (avoids no-control-regex in ESLint) */
function hasUnsafeControlCharacters(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) return true
  }
  return false
}

/**
 * Free-text fields (address, message, descriptions): allow normal text but
 * reject angle brackets, control chars, and obvious inline-script patterns.
 * Empty / whitespace-only is treated as safe (use required rules separately).
 * @param {string} value
 * @returns {boolean}
 */
export function isPlainTextSafe(value) {
  if (value == null) return true
  const s = String(value)
  if (s.trim() === '') return true
  if (hasUnsafeControlCharacters(s)) return false
  if (/[<>]/.test(s)) return false
  if (/(javascript|data|vbscript)\s*:/i.test(s)) return false
  if (/\bon\w+\s*=/i.test(s)) return false
  return true
}
