'use client'
import { withBasePath } from '@/lib/with-base-path'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminHeader from './AdminHeader'
import SuperAdminSidebar from './SuperAdminSidebar'
import { useSuperAdminPermissions } from '@/lib/use-super-admin-permissions'
import {
  clearSuperAdminSessionCache,
  isSuperAdminSessionVerified,
  markSuperAdminSessionVerified,
} from '@/lib/admin-panel-session-cache'
import { clearServerSession } from '@/lib/logout'

interface SuperAdminLayoutProps {
  children: React.ReactNode
  title?: string
}

type AuthStatus = 'loading' | 'authorized' | 'redirecting'

function readInitialSuperAdminAuthStatus(): AuthStatus {
  if (typeof window === 'undefined') return 'loading'
  if (isSuperAdminSessionVerified()) return 'authorized'
  return 'loading'
}

export default function SuperAdminLayout({ children, title }: SuperAdminLayoutProps) {
  const router = useRouter()
  const [authStatus, setAuthStatus] = useState<AuthStatus>(readInitialSuperAdminAuthStatus)
  const verifyInFlight = useRef(false)
  const { access } = useSuperAdminPermissions()

  const redirectToLogin = useCallback(() => {
    clearSuperAdminSessionCache()
    localStorage.removeItem('superAdminToken')
    localStorage.removeItem('superAdminId')
    void clearServerSession('super-admin')
    setAuthStatus('redirecting')
    router.replace('/super-admin/login')
  }, [router])

  const verifyAndAuthorize = useCallback(async () => {
    if (verifyInFlight.current) return
    verifyInFlight.current = true

    if (isSuperAdminSessionVerified()) {
      setAuthStatus('authorized')
      verifyInFlight.current = false
      return
    }

    setAuthStatus('loading')

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const verifyResponse = await fetch(withBasePath('/api/super-admin/verify'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!verifyResponse.ok) {
        if (verifyResponse.status === 401 || verifyResponse.status === 403) {
          verifyInFlight.current = false
          redirectToLogin()
          return
        }

        markSuperAdminSessionVerified()
        setAuthStatus('authorized')
        verifyInFlight.current = false
        return
      }

      const verifyData = await verifyResponse.json()

      if (!verifyData.authorized) {
        verifyInFlight.current = false
        redirectToLogin()
        return
      }

      markSuperAdminSessionVerified()
      setAuthStatus('authorized')
      verifyInFlight.current = false
    } catch (error) {
      console.error('Error verifying authorization:', error)
      const isNetworkError =
        error instanceof TypeError ||
        (error instanceof Error && error.name === 'AbortError')

      if (isNetworkError) {
        markSuperAdminSessionVerified()
        setAuthStatus('authorized')
        verifyInFlight.current = false
        return
      }

      verifyInFlight.current = false
      redirectToLogin()
    }
  }, [redirectToLogin, router])

  useEffect(() => {
    verifyAndAuthorize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    redirectToLogin()
  }

  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600" />
          <p className="text-gray-600 dark:text-gray-400">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (authStatus === 'redirecting') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600" />
          <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SuperAdminSidebar access={access} />

      <div className="lg:pl-64">
        <AdminHeader
          title={title}
          panelLabel="Super Admin"
          profileHref="/super-admin/profile"
          userType="super_admin"
          onLogout={handleLogout}
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
