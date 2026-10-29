'use client'

import { useCallback, useState } from 'react'
import {
  type AdminFieldErrors,
  type AdminFieldRules,
  hasAdminFieldErrors,
  validateAdminFields,
} from '@/lib/admin-form-validation'

export function useAdminFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  rules: AdminFieldRules
) {
  const [errors, setErrors] = useState<AdminFieldErrors>({})
  const [formError, setFormError] = useState('')

  const clearErrors = useCallback(() => {
    setErrors({})
    setFormError('')
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const validate = useCallback(
    (values: T) => {
      const nextErrors = validateAdminFields(values, rules)
      setErrors(nextErrors)
      return !hasAdminFieldErrors(nextErrors)
    },
    [rules]
  )

  return {
    errors,
    formError,
    setFormError,
    clearErrors,
    clearFieldError,
    validate,
    setErrors,
  }
}
