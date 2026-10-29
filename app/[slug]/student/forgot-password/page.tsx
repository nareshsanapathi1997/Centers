'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { withBasePath } from '@/lib/with-base-path'
import StudentAuthShell from '@/components/student/StudentAuthShell'

export default function StudentForgotPasswordPage() {
  const params = useParams()
  const centerSlug = params.slug as string
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const res = await fetch(withBasePath('/api/student/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centerSlug, email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send reset email')
        return
      }
      setMessage(data.message)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StudentAuthShell
      title="Reset password"
      subtitle="Enter your registered email and we’ll send you a secure reset link."
      backHref={`/${centerSlug}/student/login`}
      backLabel="Back to login"
    >
      {error ? <div className="sp-auth__alert sp-auth__alert--error">{error}</div> : null}
      {message ? <div className="sp-auth__alert sp-auth__alert--success">{message}</div> : null}

      <form onSubmit={handleSubmit} className="sp-auth__form sp-auth__panel-content">
        <div className="sp-auth__field">
          <label htmlFor="email">Email address <span>*</span></label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sp-auth__input"
            autoComplete="email"
          />
        </div>

        <button type="submit" disabled={loading} className="sp-auth__btn sp-auth__btn--primary">
          {loading ? <span className="sp-auth__btn-spinner" aria-hidden /> : <LogIn aria-hidden />}
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="sp-auth__footer">
        Remember your password? <Link href={`/${centerSlug}/student/login`}>Sign in</Link>
      </p>
    </StudentAuthShell>
  )
}
