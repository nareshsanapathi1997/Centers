'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Eye, EyeOff, LogIn, Smartphone } from 'lucide-react'
import { withBasePath } from '@/lib/with-base-path'
import { PASSWORD_POLICY_HINT } from '@/lib/password-policy'
import { setStudentSession } from '@/lib/student-api'
import StudentAuthShell from '@/components/student/StudentAuthShell'

interface CenterOption {
  id: number
  name: string
  slug: string
  city: string | null
}

interface Props {
  centerSlug?: string
  centerName?: string
  mode?: 'login' | 'register'
  global?: boolean
}

type LoginMethod = 'password' | 'otp'

function LoadingSpinner() {
  return <span className="sp-auth__btn-spinner" aria-hidden />
}

export default function StudentAuthPage({
  centerSlug: centerSlugProp,
  centerName,
  mode = 'login',
  global = false,
}: Props) {
  const router = useRouter()
  const isRegister = mode === 'register'

  const [centers, setCenters] = useState<CenterOption[]>([])
  const [selectedCenterSlug, setSelectedCenterSlug] = useState(centerSlugProp || '')
  const centerSlug = global && isRegister ? selectedCenterSlug : centerSlugProp || ''
  const displayCenterName =
    centerName ||
    centers.find((c) => c.slug === centerSlug)?.name ||
    (global ? 'All centres' : '')

  const loginPath = global ? '/student' : `/${centerSlugProp}/student/login`
  const registerPath = global ? '/student/register' : `/${centerSlugProp}/student/register`
  const forgotPath = global ? '/student/forgot-password' : `/${centerSlugProp}/student/forgot-password`
  const backHref = global ? '/' : `/${centerSlugProp}`

  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [otpMobile, setOtpMobile] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [registerOtpSent, setRegisterOtpSent] = useState(false)
  const [registerOtp, setRegisterOtp] = useState('')
  const [devOtpHint, setDevOtpHint] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!global || !isRegister) return
    fetch(withBasePath('/api/public/centers'), { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json()
        if (r.ok && Array.isArray(data.centers)) {
          setCenters(data.centers)
          if (!selectedCenterSlug && data.centers.length === 1) {
            setSelectedCenterSlug(data.centers[0].slug)
          }
        }
      })
      .catch(() => {})
  }, [global, isRegister, selectedCenterSlug])

  const finishLogin = (data: { centerId: number; centerSlug?: string }) => {
    const slug = data.centerSlug || centerSlug
    if (!slug) {
      setError('Could not determine your centre. Please contact support.')
      return
    }
    setStudentSession(data.centerId)
    router.push(`/${slug}/student/dashboard`)
  }

  const authPayload = (extra: Record<string, unknown>) => {
    if (global && !isRegister) return extra
    return { centerSlug, ...extra }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')

    if (isRegister && !centerSlug) {
      setError('Please select your centre')
      return
    }

    setLoading(true)

    try {
      const endpoint = isRegister ? '/api/student/register' : '/api/student/login'
      const body = isRegister
        ? { centerSlug, fullName, email, mobile, password, fatherName, otp: registerOtp }
        : authPayload({ login, password })

      const res = await fetch(withBasePath(endpoint), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      finishLogin(data)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const sendRegisterOtp = async () => {
    setError('')
    setInfo('')
    setDevOtpHint('')
    if (!centerSlug) {
      setError('Please select your centre first')
      return
    }
    if (!mobile.trim()) {
      setError('Enter your mobile number first')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(withBasePath('/api/student/otp/send'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centerSlug, mobile, purpose: 'register', email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send OTP')
        return
      }
      setRegisterOtpSent(true)
      setInfo(data.message || 'OTP sent to your mobile/email.')
      if (data.devOtp) setDevOtpHint(`Dev OTP: ${data.devOtp}`)
    } catch {
      setError('Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const sendOtp = async () => {
    setError('')
    setInfo('')
    setDevOtpHint('')
    setLoading(true)

    try {
      const res = await fetch(withBasePath('/api/student/otp/send'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authPayload({ mobile: otpMobile, purpose: 'login' })),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send OTP')
        return
      }
      setOtpSent(true)
      setInfo(data.message || 'OTP sent to your registered mobile/email.')
      if (data.devOtp) setDevOtpHint(`Dev OTP: ${data.devOtp}`)
    } catch {
      setError('Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(withBasePath('/api/student/otp/verify'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authPayload({ mobile: otpMobile, otp: otpCode })),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Invalid OTP')
        return
      }
      finishLogin(data)
    } catch {
      setError('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const title = isRegister ? 'Create your account' : 'Student Portal'
  const subtitle = isRegister
    ? `Register at ${displayCenterName || 'your centre'} to access courses and materials.`
    : global
      ? 'Sign in with mobile or email — we’ll open your centre dashboard.'
      : `Sign in to ${displayCenterName}`

  return (
    <StudentAuthShell
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      backLabel={global ? 'Back to home' : `Back to ${displayCenterName}`}
    >
      {!isRegister && (
        <div
          className="sp-auth__tabs"
          data-active={loginMethod}
          role="tablist"
          aria-label="Sign in method"
        >
          <span className="sp-auth__tab-indicator" aria-hidden />
          <button
            type="button"
            role="tab"
            aria-selected={loginMethod === 'password'}
            className={`sp-auth__tab${loginMethod === 'password' ? ' is-active' : ''}`}
            onClick={() => {
              setLoginMethod('password')
              setError('')
              setInfo('')
            }}
          >
            Password
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={loginMethod === 'otp'}
            className={`sp-auth__tab${loginMethod === 'otp' ? ' is-active' : ''}`}
            onClick={() => {
              setLoginMethod('otp')
              setError('')
              setInfo('')
            }}
          >
            OTP
          </button>
        </div>
      )}

      {error ? <div className="sp-auth__alert sp-auth__alert--error">{error}</div> : null}
      {info ? (
        <div className="sp-auth__alert sp-auth__alert--success">
          {info}
          {devOtpHint ? <code>{devOtpHint}</code> : null}
        </div>
      ) : null}

      <div className="sp-auth__panel-content" key={isRegister ? 'register' : loginMethod}>
        {!isRegister && loginMethod === 'otp' ? (
          <form onSubmit={verifyOtp} className="sp-auth__form">
            <div className="sp-auth__field">
              <label htmlFor="otp-mobile">Mobile number <span>*</span></label>
              <input
                id="otp-mobile"
                type="tel"
                required
                value={otpMobile}
                onChange={(e) => setOtpMobile(e.target.value)}
                disabled={otpSent}
                className="sp-auth__input"
                placeholder="10-digit mobile number"
                autoComplete="tel"
              />
            </div>

            {!otpSent ? (
              <button
                type="button"
                disabled={loading || !otpMobile.trim()}
                onClick={sendOtp}
                className="sp-auth__btn sp-auth__btn--primary"
              >
                {loading ? <LoadingSpinner /> : <Smartphone aria-hidden />}
                {loading ? 'Sending…' : 'Send OTP'}
              </button>
            ) : (
              <>
                <div className="sp-auth__field">
                  <label htmlFor="otp-code">Enter OTP <span>*</span></label>
                  <input
                    id="otp-code"
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="sp-auth__input sp-auth__input--otp"
                    placeholder="• • • • • •"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="sp-auth__btn sp-auth__btn--primary"
                >
                  {loading ? <LoadingSpinner /> : <LogIn aria-hidden />}
                  {loading ? 'Verifying…' : 'Verify & sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false)
                    setOtpCode('')
                    sendOtp()
                  }}
                  className="sp-auth__btn sp-auth__btn--text"
                >
                  Resend OTP
                </button>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="sp-auth__form">
            {isRegister ? (
              <>
                {global ? (
                  <div className="sp-auth__field">
                    <label htmlFor="centre">Centre <span>*</span></label>
                    <select
                      id="centre"
                      required
                      value={selectedCenterSlug}
                      onChange={(e) => {
                        setSelectedCenterSlug(e.target.value)
                        setRegisterOtpSent(false)
                        setRegisterOtp('')
                      }}
                      className="sp-auth__select"
                    >
                      <option value="">Select your centre</option>
                      {centers.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                          {c.city ? ` — ${c.city}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div className="sp-auth__field">
                  <label htmlFor="full-name">Full name <span>*</span></label>
                  <input
                    id="full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="sp-auth__input"
                    autoComplete="name"
                  />
                </div>
                <div className="sp-auth__field">
                  <label htmlFor="mobile">Mobile <span>*</span></label>
                  <div className="sp-auth__row">
                    <input
                      id="mobile"
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="sp-auth__input"
                      autoComplete="tel"
                    />
                    <button
                      type="button"
                      onClick={sendRegisterOtp}
                      disabled={loading || !mobile.trim()}
                      className="sp-auth__btn sp-auth__btn--ghost"
                    >
                      Send OTP
                    </button>
                  </div>
                </div>
                {registerOtpSent ? (
                  <div className="sp-auth__field">
                    <label htmlFor="register-otp">Mobile OTP <span>*</span></label>
                    <input
                      id="register-otp"
                      type="text"
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={registerOtp}
                      onChange={(e) => setRegisterOtp(e.target.value.replace(/\D/g, ''))}
                      className="sp-auth__input sp-auth__input--otp"
                      placeholder="• • • • • •"
                    />
                  </div>
                ) : null}
                <div className="sp-auth__field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="sp-auth__input"
                    autoComplete="email"
                  />
                </div>
                <div className="sp-auth__field">
                  <label htmlFor="father-name">Father&apos;s name</label>
                  <input
                    id="father-name"
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="sp-auth__input"
                  />
                </div>
              </>
            ) : (
              <div className="sp-auth__field">
                <label htmlFor="login">Mobile or email <span>*</span></label>
                <input
                  id="login"
                  type="text"
                  required
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="sp-auth__input"
                  placeholder="you@email.com or mobile"
                />
              </div>
            )}

            <div className="sp-auth__field">
              <label htmlFor="password">Password <span>*</span></label>
              <div className="sp-auth__input-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="sp-auth__input"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
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
              {isRegister ? <p className="sp-auth__hint">{PASSWORD_POLICY_HINT}</p> : null}
            </div>

            {!isRegister && loginMethod === 'password' ? (
              <div className="sp-auth__link-row">
                <Link href={forgotPath}>Forgot password?</Link>
              </div>
            ) : null}

            <button type="submit" disabled={loading} className="sp-auth__btn sp-auth__btn--primary">
              {loading ? <LoadingSpinner /> : <LogIn aria-hidden />}
              {loading ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>
        )}
      </div>

      <p className="sp-auth__footer">
        {isRegister ? (
          <>
            Already have an account? <Link href={loginPath}>Sign in</Link>
          </>
        ) : (
          <>
            New student? <Link href={registerPath}>Register here</Link>
          </>
        )}
      </p>
    </StudentAuthShell>
  )
}
