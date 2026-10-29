'use client'

import { useState } from 'react'
import Link from 'next/link'
import { studentFetch } from '@/lib/student-api'

interface Props {
  centerId: number
  centerSlug: string
  email: string
}

export default function StudentEmailVerifyBanner({ centerId, centerSlug, email }: Props) {
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const resend = async () => {
    setSending(true)
    setMessage('')
    setError('')
    try {
      const res = await studentFetch('/api/student/verify-email', {
        method: 'POST',
        body: JSON.stringify({ centerId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not send verification email')
        return
      }
      setMessage('Verification email sent. Check your inbox.')
    } catch {
      setError('Could not send verification email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
      <p className="font-medium">Verify your email to unlock password changes</p>
      <p className="mt-1 text-amber-800 dark:text-amber-200">
        We sent a link to <span className="font-medium break-all">{email}</span>. You can still browse courses and
        payments while unverified.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={resend}
          disabled={sending}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Resend verification email'}
        </button>
        <Link href={`/${centerSlug}/student/profile`} className="text-xs font-medium text-amber-900 dark:text-amber-100 underline">
          Open profile
        </Link>
        {message ? <span className="text-xs text-emerald-700 dark:text-emerald-400">{message}</span> : null}
        {error ? <span className="text-xs text-red-700 dark:text-red-400">{error}</span> : null}
      </div>
    </div>
  )
}
