'use client'

import { AlertCircle, CheckCircle2, X } from 'lucide-react'

type FeeAlertProps = {
  type: 'success' | 'error'
  message: string
  onDismiss?: () => void
}

export default function FeeAlert({ type, message, onDismiss }: FeeAlertProps) {
  const isSuccess = type === 'success'
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
        isSuccess
          ? 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-100'
          : 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100'
      }`}
      role="alert"
    >
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600" />
      ) : (
        <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
      )}
      <p className="flex-1">{message}</p>
      {onDismiss ? (
        <button aria-label="Close" type="button" onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  )
}
