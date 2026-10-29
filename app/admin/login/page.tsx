'use client'
import { withBasePath } from '@/lib/with-base-path'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DarkModeToggle from '@/components/admin/DarkModeToggle'
import AdminPanelLogo from '@/components/admin/AdminPanelLogo'
import AdminLoginFooter from '@/components/admin/AdminLoginFooter'
import { LogIn, Eye, EyeOff } from 'lucide-react'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(withBasePath('/api/admin/login'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()

      if (response.ok) {
        const centerId = data.centerId.toString()
        localStorage.setItem('centerId', centerId)
        if (data.mustChangePassword) {
          router.push(`/admin/${centerId}/profile`)
        } else {
          router.push(`/admin/${centerId}/dashboard`)
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
    <div className="min-h-screen flex flex-col font-sans overflow-x-hidden max-w-[100vw] bg-[var(--cm-admin-bg,#f8fafc)] dark:bg-[var(--cm-admin-bg,#0b0f19)]">
      <div className="fixed top-4 right-4 z-50">
        <DarkModeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center p-5 min-w-0">
        <div className="w-full max-w-[min(420px,100%)] min-w-0">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-5">
              <AdminPanelLogo size="lg" />
            </div>
            <h1 className="text-[28px] font-bold text-gray-900 dark:text-white tracking-tight mb-2">
              EduSphere CenterHub
            </h1>
            <p className="text-[15px] text-gray-600 dark:text-gray-400 m-0">
              Sign in to access your admin dashboard
            </p>
          </div>

        <div className="bg-white dark:bg-gray-800/95 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 sm:p-10">
          <form onSubmit={handleSubmit}>
            {error && (
              <div
                className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl mb-6 border bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
              >
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <div className="mb-5">
              <label
                htmlFor="username"
                className="admin-form-label"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="admin-login-input"
              />
            </div>

            <div className="mb-7">
              <label
                htmlFor="password"
                className="admin-form-label"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="admin-login-input admin-login-input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md border-0 bg-transparent cursor-pointer flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="admin-login-btn">
              {loading ? (
                <>
                  <div
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    aria-hidden
                  />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" aria-hidden />
                  <span>Sign In</span>
                </>
              )}
            </button>

            <div className="mt-4 text-center">
              <Link
                href="/admin/forgot-password"
                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
          </form>
        </div>
        </div>
      </div>

      <AdminLoginFooter />
    </div>
  )
}
