'use client'
import { withBasePath } from '@/lib/with-base-path'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DarkModeToggle from '@/components/admin/DarkModeToggle'
import AdminPanelLogo from '@/components/admin/AdminPanelLogo'
import { LogIn } from 'lucide-react'

export default function SuperAdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(withBasePath('/api/super-admin/login'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('superAdminId', data.adminId)
        if (data.mustChangePassword) {
          router.push('/super-admin/profile')
        } else {
          router.push('/super-admin/dashboard')
        }
      } else {
        setError(data.error || 'Invalid credentials')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--cm-admin-bg,#f8fafc)] dark:bg-[var(--cm-admin-bg,#0b0f19)] p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[rgba(79,70,229,0.12)] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-[rgba(99,102,241,0.08)] blur-3xl" />
      </div>

      {/* Dark Mode Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <DarkModeToggle />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <AdminPanelLogo size="lg" />
          </div>
          <h2 className="text-4xl font-bold font-display tracking-tight text-[var(--cm-admin-text,#0f172a)] dark:text-[var(--cm-admin-text,#f8fafc)] mb-3">
            Super Admin
          </h2>
          <p className="text-[var(--cm-admin-text-muted,#475569)] text-lg">Sign in to manage all centers</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8 lg:p-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="admin-login-input-clean"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="admin-login-input-clean"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="admin-login-btn"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>

            {/* Forgot Password Link */}
            <div className="mt-4 text-center">
              <Link
                href="/super-admin/forgot-password"
                className="text-sm text-primary hover:text-primary-strong"
              >
                Forgot Password?
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/admin/login"
            className="text-sm text-[var(--cm-admin-text-muted)] hover:text-primary"
          >
            Center Admin Login →
          </Link>
        </div>
      </div>
    </div>
  )
}

