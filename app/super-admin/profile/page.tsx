'use client'

import { useEffect, useState } from 'react'
import { superAdminFetch } from '@/lib/super-admin-api'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import ErrorState from '@/components/ui/ErrorState'
import { Input } from '@/components/forms'
import { User, Mail, Calendar, Save, Eye, EyeOff } from 'lucide-react'

export default function SuperAdminProfile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [profile, setProfile] = useState<{
    username?: string
    email?: string
    full_name?: string
    created_at?: string
  } | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoadError(null)
      const response = await superAdminFetch('/api/super-admin/profile')

      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setFormData({
          email: data.email || '',
          full_name: data.full_name || '',
        })
      } else {
        setLoadError('Failed to load profile')
        setMessage({ type: 'error', text: 'Failed to load profile' })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setLoadError('Error loading profile')
      setMessage({ type: 'error', text: 'Error loading profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const response = await superAdminFetch('/api/super-admin/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        fetchProfile()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to update profile' })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'Error updating profile' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      setSaving(false)
      return
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' })
      setSaving(false)
      return
    }

    try {
      const response = await superAdminFetch('/api/super-admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' })
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to change password' })
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setMessage({ type: 'error', text: 'Error changing password' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SuperAdminPageShell>
        <div className="space-y-6">
          <PageHeader
            title={
              <span className="flex items-center gap-2">
                <User className="h-7 w-7" />
                Profile
              </span>
            }
            description="Manage your super admin account"
            breadcrumbs={[
              { label: 'Super Admin', href: '/super-admin' },
              { label: 'Profile' },
            ]}
          />
          <LoadingSkeleton variant="cards" rows={4} />
        </div>
      </SuperAdminPageShell>
    )
  }

  if (loadError && !profile) {
    return (
      <SuperAdminPageShell>
        <div className="space-y-6">
          <PageHeader
            title={
              <span className="flex items-center gap-2">
                <User className="h-7 w-7" />
                Profile
              </span>
            }
            description="Manage your super admin account"
            breadcrumbs={[
              { label: 'Super Admin', href: '/super-admin' },
              { label: 'Profile' },
            ]}
          />
          <ErrorState error={loadError} onRetry={() => {
            setLoading(true)
            void fetchProfile()
          }} />
        </div>
      </SuperAdminPageShell>
    )
  }

  return (
    <SuperAdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <User className="h-7 w-7" />
              Profile
            </span>
          }
          description="Manage your super admin account"
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Profile' },
          ]}
        />

        {message ? (
          <div
            className={`rounded-lg border p-4 ${
              message.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
                : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="admin-card overflow-hidden">
          <div className="border-b border-[var(--cm-color-border)] px-6 py-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <User className="h-5 w-5" />
              Profile Information
            </h2>
          </div>
          <form onSubmit={handleProfileUpdate} className="space-y-4 p-6">
            <div>
              <label className="admin-form-label" htmlFor="sa-username">
                Username
              </label>
              <Input id="sa-username" type="text" value={profile?.username || ''} disabled />
            </div>

            <div>
              <label className="admin-form-label flex items-center gap-2" htmlFor="sa-email">
                <Mail className="h-4 w-4" />
                Email
              </label>
              <Input
                id="sa-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="admin-form-label" htmlFor="sa-fullname-name">
                Full Name
              </label>
              <Input
                id="sa-full-name"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            {profile?.created_at ? (
              <div className="flex items-center gap-2 text-sm text-[var(--cm-color-text-muted)]">
                <Calendar className="h-4 w-4" />
                <span>Member since: {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="admin-btn admin-btn--primary admin-btn--md disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="admin-card overflow-hidden">
          <div className="border-b border-[var(--cm-color-border)] px-6 py-4">
            <h2 className="text-xl font-semibold">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4 p-6">
            <div>
              <label className="admin-form-label" htmlFor="sa-current-password">
                Current Password
              </label>
              <div className="relative">
                <Input
                  id="sa-current-password"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cm-color-text-muted)]"
                  aria-label={showPasswords.current ? 'Hide password' : 'Show password'}
                >
                  {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="admin-form-label" htmlFor="sa-new-password">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="sa-new-password"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  className="pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cm-color-text-muted)]"
                  aria-label={showPasswords.new ? 'Hide password' : 'Show password'}
                >
                  {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="admin-form-label" htmlFor="sa-confirm-password">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="sa-confirm-password"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  className="pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--cm-color-text-muted)]"
                  aria-label={showPasswords.confirm ? 'Hide password' : 'Show password'}
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="admin-btn admin-btn--primary admin-btn--md disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </SuperAdminPageShell>
  )
}
