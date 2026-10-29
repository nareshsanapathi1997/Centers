'use client'

import type { ReactNode } from 'react'
import AdminFormField from '@/components/admin/AdminFormField'

type FormFieldProps = {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

/** Thin alias so form-kit consumers do not import from admin/ directly. */
export default function FormField(props: FormFieldProps) {
  return <AdminFormField {...props} />
}
