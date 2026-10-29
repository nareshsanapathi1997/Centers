export type AdminFieldRule =
  | { type: 'required'; message?: string }
  | { type: 'email'; message?: string; optional?: boolean }
  | { type: 'url'; message?: string; optional?: boolean }
  | { type: 'minLength'; value: number; message?: string }
  | { type: 'slug'; message?: string }
  | { type: 'custom'; validate: (value: unknown) => string | null; message?: string }

export type AdminFieldRules = Record<string, AdminFieldRule[]>

export type AdminFieldErrors = Record<string, string>

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

function runRule(rule: AdminFieldRule, value: unknown): string | null {
  switch (rule.type) {
    case 'required':
      return isEmpty(value) ? rule.message || 'This field is required.' : null
    case 'email':
      if (rule.optional && isEmpty(value)) return null
      if (isEmpty(value)) return null
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
        ? null
        : rule.message || 'Enter a valid email address.'
    case 'url':
      if (rule.optional && isEmpty(value)) return null
      if (isEmpty(value)) return rule.message || 'Enter a valid URL.'
      return isValidUrl(String(value).trim()) ? null : rule.message || 'Enter a valid URL (http or https).'
    case 'minLength':
      if (isEmpty(value)) return null
      return String(value).length >= rule.value
        ? null
        : rule.message || `Must be at least ${rule.value} characters.`
    case 'slug':
      if (isEmpty(value)) return null
      return isValidSlug(String(value).trim())
        ? null
        : rule.message || 'Use lowercase letters, numbers, and hyphens only.'
    case 'custom':
      return rule.validate(value) || rule.message || 'Invalid value.'
    default:
      return null
  }
}

export function validateAdminFields(
  values: Record<string, unknown>,
  rules: AdminFieldRules
): AdminFieldErrors {
  const errors: AdminFieldErrors = {}

  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules) {
      const message = runRule(rule, values[field])
      if (message) {
        errors[field] = message
        break
      }
    }
  }

  return errors
}

export function hasAdminFieldErrors(errors: AdminFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function getAdminFieldError(errors: AdminFieldErrors, field: string): string | undefined {
  return errors[field]
}
