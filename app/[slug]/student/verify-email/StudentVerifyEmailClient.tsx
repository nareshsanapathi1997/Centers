'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import StudentAuthShell from '@/components/student/StudentAuthShell'
import { studentFetch } from '@/lib/student-api'

export default function StudentVerifyEmailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = String(params.slug || '')
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('loading')
  const [message, setMessage] = useState('')
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const studentId = searchParams.get('studentId')
    const token = searchParams.get('token')

    const centerId = typeof window !== 'undefined' ? localStorage.getItem('studentCenterId') : null
    if (centerId) {
      studentFetch('/api/student/verify', {
        method: 'POST',
        body: JSON.stringify({ centerId: parseInt(centerId, 10) }),
      })
        .then((r) => r.json())
        .then((data) => setLoggedIn(Boolean(data.authorized)))
        .catch(() => setLoggedIn(false))
    }

    if (!studentId || !token) {
      setStatus('idle')
      setMessage(
        'Open the verification link from your email, or request a new verification email if you are signed in.'
      )
      return
    }

    fetch(`/api/student/verify-email?studentId=${studentId}&token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json()
        if (r.ok) {
          setStatus('success')
          setMessage(data.message || 'Email verified!')
        } else {
          setStatus('error')
          setMessage(data.error || 'Verification failed.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Verification failed.')
      })
  }, [searchParams])

  const resend = async () => {
    const centerId = localStorage.getItem('studentCenterId')
    if (!centerId) {
      setResendMsg('Sign in to resend a verification email.')
      return
    }
    setResending(true)
    setResendMsg('')
    try {
      const res = await studentFetch('/api/student/verify-email', {
        method: 'POST',
        body: JSON.stringify({ centerId: parseInt(centerId, 10) }),
      })
      const data = await res.json()
      setResendMsg(res.ok ? data.message || 'Verification email sent' : data.error || 'Could not resend')
    } catch {
      setResendMsg('Could not resend verification email')
    } finally {
      setResending(false)
    }
  }

  return (
    <StudentAuthShell
      title={status === 'success' ? 'Email verified' : status === 'error' ? 'Verification unsuccessful' : 'Verify your email'}
      subtitle="Keep your learning account connected."
      backHref={loggedIn ? `/${slug}/student/profile` : `/${slug}/student/login`}
      backLabel={loggedIn ? 'Back to profile' : 'Back to login'}
    >
      <div className="sp-stack" aria-live="polite">
        {status === 'loading' ? <p role="status" className="sp-muted">Verifying your email…</p> : (
          <>
            <p className={status === 'error' ? 'sp-alert sp-alert--error' : 'sp-muted'}>{message}</p>
            {status === 'success' ? (
              <Link href={loggedIn ? `/${slug}/student/dashboard` : `/${slug}/student/login`} className="sp-btn sp-btn--primary">
                {loggedIn ? 'Go to dashboard' : 'Go to login'}
              </Link>
            ) : loggedIn ? (
              <>
                <button type="button" onClick={resend} disabled={resending} className="sp-btn sp-btn--primary">
                  {resending ? 'Sending…' : 'Resend verification email'}
                </button>
                {resendMsg && <p role="status" className="sp-muted">{resendMsg}</p>}
              </>
            ) : (
              <>
                <p className="sp-muted">Sign in to your student account, then resend verification from your profile.</p>
                <Link href={`/${slug}/student/login`} className="sp-btn sp-btn--primary">Sign in to continue</Link>
              </>
            )}
          </>
        )}
      </div>
    </StudentAuthShell>
  )
}
