'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { withBasePath } from '@/lib/with-base-path'
import StudentAuthShell from '@/components/student/StudentAuthShell'

interface Props {
  global?: boolean
}

export default function StudentResetPasswordForm({ global = false }: Props) {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const centerSlug = (params.slug as string | undefined) || undefined
  const token = searchParams.get('token') || ''

  const loginPath = global || !centerSlug ? '/student' : `/${centerSlug}/student/login`
  const forgotPath = global || !centerSlug ? '/student/forgot-password' : `/${centerSlug}/student/forgot-password`
  const backHref = global || !centerSlug ? '/student' : `/${centerSlug}`

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(withBasePath('/api/student/reset-password'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to reset password')
        return
      }
      router.push(`${loginPath}?reset=1`)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <StudentAuthShell
        title="Invalid link"
        subtitle="This password reset link is missing or has expired."
        backHref={loginPath}
        backLabel="Back to login"
      >
        <div className="sp-auth__alert sp-auth__alert--error">
          Please request a new reset link to continue.
        </div>
        <Link href={forgotPath} className="sp-auth__btn sp-auth__btn--primary">
          Request new link
        </Link>
      </StudentAuthShell>
    )
  }

  return (
    <StudentAuthShell
      title="Set new password"
      subtitle="Choose a strong password you haven’t used before."
      backHref={loginPath}
      backLabel="Back to login"
    >
      {error ? <div className="sp-auth__alert sp-auth__alert--error">{error}</div> : null}

      <form onSubmit={handleSubmit} className="sp-auth__form sp-auth__panel-content">
        <div className="sp-auth__field">
          <label htmlFor="password">New password <span>*</span></label>
          <div className="sp-auth__input-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="sp-auth__input"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="sp-auth__toggle-pwd"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </button>
          </div>
        </div>

        <div className="sp-auth__field">
          <label htmlFor="confirm">Confirm password <span>*</span></label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="sp-auth__input"
            autoComplete="new-password"
          />
        </div>

        <button type="submit" disabled={loading} className="sp-auth__btn sp-auth__btn--primary">
          {loading ? <span className="sp-auth__btn-spinner" aria-hidden /> : <LogIn aria-hidden />}
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </StudentAuthShell>
  )
}
