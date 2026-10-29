'use client'

import type { ReactNode } from 'react'

interface AdminFormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

export default function AdminFormField({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  children,
  className = '',
}: AdminFormFieldProps) {
  return (
    <div className={`admin-form-field ${className}`.trim()}>
      <label htmlFor={htmlFor} className="admin-form-label">
        {label}
        {required ? <span className="admin-form-label__required">*</span> : null}
      </label>
      {children}
      {error ? <p className="admin-form-error">{error}</p> : null}
      {!error && hint ? <p className="admin-form-hint">{hint}</p> : null}
    </div>
  )
}
