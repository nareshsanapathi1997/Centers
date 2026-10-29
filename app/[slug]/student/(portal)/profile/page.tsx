'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { withBasePathHref } from '@/lib/with-base-path'
import { studentFetch } from '@/lib/student-api'
import { PASSWORD_POLICY_HINT } from '@/lib/password-policy'
import { useStudentPortal } from '@/components/student/StudentPortalContext'
import StudentPageFrame from '@/components/student/StudentPageFrame'
import StudentErrorState from '@/components/student/StudentErrorState'
import StudentLoadingState from '@/components/student/StudentLoadingState'

type GuardianForm = {
  fullName: string
  relation: string
  mobile: string
  email: string
  isPrimary: boolean
}

type SessionRow = {
  id: number
  jti: string
  userAgent: string | null
  ipAddress: string | null
  createdAt: string
  expiresAt: string
  revoked: boolean
  current: boolean
}

const emptyGuardian = (): GuardianForm => ({
  fullName: '',
  relation: '',
  mobile: '',
  email: '',
  isPrimary: false,
})

function formatDob(value: string | null | undefined) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function summarizeUserAgent(ua: string | null) {
  if (!ua) return 'Unknown device'
  if (/Mobile|Android|iPhone/i.test(ua)) return 'Mobile browser'
  if (/Edg\//.test(ua)) return 'Edge'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua)) return 'Safari'
  return ua.slice(0, 48)
}

function mapGuardians(rows: any[] | undefined): GuardianForm[] {
  return (rows || []).map((g: any) => ({
    fullName: g.full_name || '',
    relation: g.relation || '',
    mobile: g.mobile || '',
    email: g.email || '',
    isPrimary: Boolean(g.is_primary),
  }))
}

export default function StudentProfilePage() {
  const { centerId, centerSlug: slug } = useStudentPortal()
  const [student, setStudent] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [resendMsg, setResendMsg] = useState('')
  const [resending, setResending] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [sessionBusy, setSessionBusy] = useState<string | null>(null)
  const [formHydrated, setFormHydrated] = useState(false)

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    fatherName: '',
    address: '',
    state: '',
    city: '',
    pincode: '',
    dateOfBirth: '',
    currentPassword: '',
    newPassword: '',
    notifyEmail: true,
    notifyInApp: true,
  })
  const [guardians, setGuardians] = useState<GuardianForm[]>([])

  const profileQuery = useQuery({
    queryKey: ['student', 'profile', centerId],
    queryFn: async () => {
      const r = await studentFetch(`/api/student/profile?centerId=${centerId}`)
      const data = await r.json().catch(() => ({}))
      if (!r.ok || !data.student) {
        throw new Error(data.error || 'Unable to load profile')
      }
      return {
        student: data.student,
        guardians: data.guardians || [],
      }
    },
  })

  const sessionsQuery = useQuery({
    queryKey: ['student', 'sessions', centerId],
    queryFn: async () => {
      const res = await studentFetch(`/api/student/sessions?centerId=${centerId}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Unable to load sessions')
      return ((data.sessions || []) as SessionRow[]).filter((s) => !s.revoked)
    },
  })

  useEffect(() => {
    if (!profileQuery.data || formHydrated) return
    const s = profileQuery.data.student
    setStudent(s)
    setForm((f) => ({
      ...f,
      fullName: s.full_name || '',
      email: s.email || '',
      fatherName: s.father_name || '',
      address: s.address || '',
      state: s.state || '',
      city: s.city || '',
      pincode: s.pincode || '',
      dateOfBirth: formatDob(s.date_of_birth),
      notifyEmail: s.notify_email !== false,
      notifyInApp: s.notify_in_app !== false,
    }))
    setGuardians(mapGuardians(profileQuery.data.guardians))
    setFormHydrated(true)
  }, [profileQuery.data, formHydrated])

  const emailUnverified = Boolean(student?.email && !student?.email_verified)
  const photoSrc = useMemo(
    () => (student?.photo_url ? withBasePathHref(student.photo_url) : ''),
    [student?.photo_url]
  )

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    setSaving(true)
    try {
      if (form.dateOfBirth) {
        const dob = new Date(`${form.dateOfBirth}T00:00:00`)
        if (Number.isNaN(dob.getTime()) || dob > new Date()) {
          setError('Date of birth cannot be in the future')
          return
        }
      }

      const res = await studentFetch('/api/student/profile', {
        method: 'PUT',
        body: JSON.stringify({
          centerId,
          fullName: form.fullName,
          email: form.email,
          fatherName: form.fatherName,
          address: form.address,
          state: form.state,
          city: form.city,
          pincode: form.pincode,
          dateOfBirth: form.dateOfBirth || null,
          notifyEmail: form.notifyEmail,
          notifyInApp: form.notifyInApp,
          currentPassword: form.currentPassword || undefined,
          newPassword: form.newPassword || undefined,
          guardians,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update profile')
        return
      }
      setStudent(data.student)
      setGuardians(mapGuardians(data.guardians))
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '' }))
      setMessage('Profile updated successfully')
      void profileQuery.refetch()
    } catch {
      setError('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const resendVerification = async () => {
    setResending(true)
    setResendMsg('')
    try {
      const res = await studentFetch('/api/student/verify-email', {
        method: 'POST',
        body: JSON.stringify({ centerId }),
      })
      const data = await res.json()
      setResendMsg(res.ok ? data.message || 'Verification email sent' : data.error || 'Failed to resend')
    } catch {
      setResendMsg('Failed to resend verification email')
    } finally {
      setResending(false)
    }
  }

  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadingPhoto(true)
    setError('')
    setMessage('')
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('centerId', String(centerId))
      const res = await studentFetch('/api/student/profile/photo', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Photo upload failed')
        return
      }
      setStudent(data.student)
      setMessage('Profile photo updated')
      void profileQuery.refetch()
    } catch {
      setError('Photo upload failed')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const revokeSession = async (jti: string) => {
    setSessionBusy(jti)
    try {
      const res = await studentFetch(
        `/api/student/sessions?centerId=${centerId}&jti=${encodeURIComponent(jti)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Could not revoke session')
        return
      }
      await sessionsQuery.refetch()
      setMessage('Session revoked')
    } catch {
      setError('Could not revoke session')
    } finally {
      setSessionBusy(null)
    }
  }

  const revokeOtherSessions = async () => {
    setSessionBusy('all')
    try {
      const res = await studentFetch(`/api/student/sessions?centerId=${centerId}&all=true`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Could not revoke sessions')
        return
      }
      await sessionsQuery.refetch()
      setMessage('Other sessions revoked')
    } catch {
      setError('Could not revoke sessions')
    } finally {
      setSessionBusy(null)
    }
  }

  const updateGuardian = (index: number, patch: Partial<GuardianForm>) => {
    setGuardians((prev) =>
      prev.map((g, i) => {
        if (i !== index) {
          if (patch.isPrimary) return { ...g, isPrimary: false }
          return g
        }
        return { ...g, ...patch }
      })
    )
  }

  if (profileQuery.isError) {
    return (
      <StudentPageFrame
        title="My Profile"
        breadcrumbs={[
          { label: 'Dashboard', href: `/${slug}/student/dashboard` },
          { label: 'Profile' },
        ]}
      >
        <StudentErrorState
          error={profileQuery.error}
          onRetry={() => {
            setFormHydrated(false)
            void profileQuery.refetch()
          }}
        />
      </StudentPageFrame>
    )
  }

  const sessions = sessionsQuery.data ?? []

  return (
    <StudentPageFrame
      title="My Profile"
      subtitle={
        [student?.regno ? `Registration No: ${student.regno}` : '', student?.mobile ? `Mobile: ${student.mobile}` : '']
          .filter(Boolean)
          .join(' · ') || undefined
      }
      breadcrumbs={[
        { label: 'Dashboard', href: `/${slug}/student/dashboard` },
        { label: 'Profile' },
      ]}
      loading={profileQuery.isLoading}
      loadingLabel="Loading profile"
      loadingRows={3}
    >
      {/* Keep sp-* inputs — shared form kit uses admin-form-control and clashes with portal CSS. */}
      <form onSubmit={handleSave} className="sp-form">
        {error ? (
          <div className="sp-alert sp-alert--error" role="alert">
            {error}
          </div>
        ) : null}
        {message ? <div className="sp-alert sp-alert--success">{message}</div> : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              height: 80,
              width: 80,
              overflow: 'hidden',
              borderRadius: '50%',
              border: '1px solid var(--sp-border)',
              background: '#f1f5f9',
              flexShrink: 0,
            }}
          >
            {photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoSrc} alt="Profile" style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
            ) : (
              <div
                style={{
                  display: 'flex',
                  height: '100%',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: 'var(--sp-text-muted)',
                }}
              >
                No photo
              </div>
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <label className="sp-label">Profile photo</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={onPhotoChange}
              disabled={uploadingPhoto}
              className="sp-input"
            />
            <p className="sp-form__hint">JPG or PNG, up to 500KB</p>
            {uploadingPhoto ? <p className="sp-form__hint" style={{ color: 'var(--sp-brand-600)' }}>Uploading…</p> : null}
          </div>
        </div>

        <div>
          <label className="sp-label">Full name</label>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="sp-input"
          />
        </div>

        <div>
          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <label className="sp-label" style={{ marginBottom: 0 }}>
              Email
            </label>
            {student?.email ? (
              student.email_verified ? (
                <span className="sp-badge sp-badge--ok">Verified</span>
              ) : (
                <span className="sp-badge sp-badge--warn">Unverified</span>
              )
            ) : null}
          </div>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="sp-input"
          />
          {emailUnverified ? (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={resendVerification}
                disabled={resending}
                className="sp-group__link"
              >
                {resending ? 'Sending…' : 'Resend verification email'}
              </button>
              {resendMsg ? <span className="sp-form__hint" style={{ margin: 0 }}>{resendMsg}</span> : null}
            </div>
          ) : null}
        </div>

        <div>
          <label className="sp-label">Date of birth</label>
          <input
            type="date"
            value={form.dateOfBirth}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            className="sp-input"
          />
        </div>

        {(['fatherName', 'address', 'city', 'state', 'pincode'] as const).map((field) => (
          <div key={field}>
            <label className="sp-label" style={{ textTransform: 'capitalize' }}>
              {field.replace(/([A-Z])/g, ' $1')}
            </label>
            <input
              type="text"
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="sp-input"
            />
          </div>
        ))}

        <hr className="sp-form__divider" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h3 className="sp-form__section-title">Guardians</h3>
          <button
            type="button"
            disabled={guardians.length >= 5}
            onClick={() => setGuardians((g) => [...g, emptyGuardian()])}
            className="sp-group__link"
          >
            Add guardian
          </button>
        </div>
        {guardians.length === 0 ? (
          <p className="sp-form__hint" style={{ margin: 0 }}>
            No guardians added yet.
          </p>
        ) : (
          <div className="sp-stack">
            {guardians.map((g, index) => (
              <div key={index} className="sp-card-plain" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Guardian {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => setGuardians((prev) => prev.filter((_, i) => i !== index))}
                    className="sp-group__link"
                    style={{ color: 'var(--sp-danger)' }}
                  >
                    Remove
                  </button>
                </div>
                <div className="sp-stack">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={g.fullName}
                    onChange={(e) => updateGuardian(index, { fullName: e.target.value })}
                    className="sp-input"
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                    <input
                      type="text"
                      placeholder="Relation"
                      value={g.relation}
                      onChange={(e) => updateGuardian(index, { relation: e.target.value })}
                      className="sp-input"
                    />
                    <input
                      type="tel"
                      placeholder="Mobile"
                      value={g.mobile}
                      onChange={(e) => updateGuardian(index, { mobile: e.target.value })}
                      className="sp-input"
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={g.email}
                    onChange={(e) => updateGuardian(index, { email: e.target.value })}
                    className="sp-input"
                  />
                  <label className="sp-check">
                    <input
                      type="checkbox"
                      checked={g.isPrimary}
                      onChange={(e) => updateGuardian(index, { isPrimary: e.target.checked })}
                    />
                    Primary guardian
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        <hr className="sp-form__divider" />
        <h3 className="sp-form__section-title">Notification preferences</h3>
        <label className="sp-check">
          <input
            type="checkbox"
            checked={form.notifyEmail}
            onChange={(e) => setForm({ ...form, notifyEmail: e.target.checked })}
          />
          Email notifications
        </label>
        <label className="sp-check">
          <input
            type="checkbox"
            checked={form.notifyInApp}
            onChange={(e) => setForm({ ...form, notifyInApp: e.target.checked })}
          />
          In-app notifications
        </label>

        <hr className="sp-form__divider" />
        <h3 className="sp-form__section-title">Change password</h3>
        {emailUnverified ? (
          <div className="sp-alert sp-alert--warn">Verify your email before changing your password.</div>
        ) : null}

        <div>
          <label className="sp-label">Current password</label>
          <input
            type="password"
            value={form.currentPassword}
            disabled={emailUnverified}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            className="sp-input"
          />
        </div>
        <div>
          <label className="sp-label">New password</label>
          <input
            type="password"
            minLength={8}
            value={form.newPassword}
            disabled={emailUnverified}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            className="sp-input"
          />
          <p className="sp-form__hint">{PASSWORD_POLICY_HINT}</p>
        </div>

        <div className="sp-form-actions">
          <p className="sp-form-actions__hint">Updates apply to your student account immediately.</p>
          <button type="submit" disabled={saving} className="sp-btn sp-btn--primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <section className="sp-card-plain" style={{ maxWidth: '40rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div>
            <h3 className="sp-form__section-title">Device sessions</h3>
            <p className="sp-form__hint" style={{ marginTop: 4 }}>
              Manage where you are signed in.
            </p>
          </div>
          <button
            type="button"
            onClick={revokeOtherSessions}
            disabled={sessionBusy === 'all' || sessions.filter((s) => !s.current).length === 0}
            className="sp-group__link"
            style={{ color: 'var(--sp-danger)' }}
          >
            {sessionBusy === 'all' ? 'Revoking…' : 'Revoke other sessions'}
          </button>
        </div>

        {sessionsQuery.isLoading ? (
          <StudentLoadingState label="Loading sessions" compact />
        ) : sessionsQuery.isError ? (
          <StudentErrorState
            error={sessionsQuery.error}
            title="Could not load sessions"
            onRetry={() => void sessionsQuery.refetch()}
          />
        ) : sessions.length === 0 ? (
          <p className="sp-form__hint" style={{ margin: 0 }}>
            No active sessions found.
          </p>
        ) : (
          <div className="sp-group__body">
            {sessions.map((s) => (
              <div key={s.id} className="sp-item" style={{ paddingLeft: 0, paddingRight: 0 }}>
                <div className="sp-item__main">
                  <div className="sp-item__title-row">
                    <p className="sp-item__title" style={{ fontSize: '0.875rem' }}>
                      {summarizeUserAgent(s.userAgent)}
                    </p>
                    {s.current ? <span className="sp-badge sp-badge--mock">This device</span> : null}
                  </div>
                  <p className="sp-item__desc">
                    {s.ipAddress || 'IP unknown'} · Signed in {new Date(s.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
                {!s.current ? (
                  <div className="sp-item__aside">
                    <button
                      type="button"
                      onClick={() => revokeSession(s.jti)}
                      disabled={sessionBusy === s.jti}
                      className="sp-group__link"
                      style={{ color: 'var(--sp-danger)' }}
                    >
                      {sessionBusy === s.jti ? 'Revoking…' : 'Revoke'}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </StudentPageFrame>
  )
}
