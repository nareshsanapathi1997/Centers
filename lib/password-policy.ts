const MIN_LENGTH = 8

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_LENGTH} characters` }
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' }
  }
  return { valid: true }
}

export const PASSWORD_POLICY_HINT =
  'At least 8 characters with one letter and one number.'
