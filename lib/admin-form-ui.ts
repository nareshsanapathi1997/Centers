import type { AdminFieldErrors } from '@/lib/admin-form-validation'

export function adminControlClass(
  errors: AdminFieldErrors,
  field: string,
  baseClass = 'admin-form-control'
): string {
  return `${baseClass}${errors[field] ? ' admin-form-control--invalid' : ''}`
}
