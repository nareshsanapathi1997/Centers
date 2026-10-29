'use client'
import { withBasePath } from '@/lib/with-base-path'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'
import { AdminCenterProvider } from './AdminCenterContext'
import {
  getCachedAdminCenter,
  isAdminSessionVerified,
  markAdminSessionVerified,
  setCachedAdminCenter,
  clearAdminSessionCache,
} from '@/lib/admin-panel-session-cache'
import { invalidateAdminFetchCache } from '@/lib/admin-fetch-cache'
import { invalidateNotificationsCache } from '@/lib/admin-notifications-cache'
import { useAdminPermissions } from '@/lib/use-admin-permissions'
import { clearServerSession } from '@/lib/logout'

interface AdminLayoutProps {
  children: React.ReactNode
  centerId: string
  title?: string
  backUrl?: string
}

type AuthStatus = 'loading' | 'authorized' | 'redirecting'

function readInitialAdminState(centerId: string): { authStatus: AuthStatus; center: Record<string, unknown> | null } {
  if (typeof window === 'undefined') {
    return { authStatus: 'loading', center: null }
  }

  const cachedCenter = getCachedAdminCenter(centerId)
  if (isAdminSessionVerified(centerId)) {
    return { authStatus: 'authorized', center: cachedCenter }
  }

  return { authStatus: 'loading', center: cachedCenter }
}

export default function AdminLayout({ children, centerId, title, backUrl }: AdminLayoutProps) {
  const router = useRouter()
  const initialState = readInitialAdminState(centerId)
  const [center, setCenter] = useState<Record<string, unknown> | null>(initialState.center)
  const [authStatus, setAuthStatus] = useState<AuthStatus>(initialState.authStatus)
  const verifyInFlight = useRef(false)
  const { access: permissions } = useAdminPermissions(centerId)

  const redirectToLogin = useCallback(() => {
    clearAdminSessionCache()
    localStorage.removeItem('adminToken')
    localStorage.removeItem('centerId')
    void clearServerSession('admin')
    setAuthStatus('redirecting')
    router.replace('/admin/login')
  }, [router])

  const fetchCenter = useCallback(async () => {
    try {
      const response = await fetch(withBasePath(`/api/admin/center/${centerId}`), {
        credentials: 'include',
      })
      if (!response.ok) return
      const data = await response.json()
      setCenter(data)
      setCachedAdminCenter(centerId, data)
    } catch (error) {
      console.error('Error fetching center:', error)
    }
  }, [centerId])

  const verifyAndFetch = useCallback(async () => {
    if (verifyInFlight.current) return
    verifyInFlight.current = true

    const storedCenterId = localStorage.getItem('centerId')

    const cachedCenter = getCachedAdminCenter(centerId)
    if (isAdminSessionVerified(centerId)) {
      setAuthStatus('authorized')
      if (cachedCenter) setCenter(cachedCenter)
      verifyInFlight.current = false
      if (!cachedCenter) void fetchCenter()
      return
    }

    setAuthStatus('loading')

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const centerPromise = fetch(withBasePath(`/api/admin/center/${centerId}`), {
        credentials: 'include',
      })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null)

      const verifyResponse = await fetch(withBasePath('/api/admin/verify'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ centerId: Number(centerId) }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!verifyResponse.ok) {
        if (verifyResponse.status === 401 || verifyResponse.status === 403) {
          verifyInFlight.current = false
          redirectToLogin()
          return
        }

        setAuthStatus('authorized')
        verifyInFlight.current = false
        const centerData = await centerPromise
        if (centerData) {
          setCenter(centerData)
          setCachedAdminCenter(centerId, centerData)
        }
        return
      }

      const verifyData = await verifyResponse.json()

      if (!verifyData.authorized) {
        if (storedCenterId && storedCenterId !== centerId) {
          setAuthStatus('redirecting')
          verifyInFlight.current = false
          router.replace(`/admin/${storedCenterId}/dashboard`)
          return
        }

        verifyInFlight.current = false
        redirectToLogin()
        return
      }

      markAdminSessionVerified(centerId)
      setAuthStatus('authorized')
      verifyInFlight.current = false

      const centerData = await centerPromise
      if (centerData) {
        setCenter(centerData)
        setCachedAdminCenter(centerId, centerData)
      }
    } catch (error) {
      console.error('Error verifying authorization:', error)
      const isNetworkError =
        error instanceof TypeError ||
        (error instanceof Error && error.name === 'AbortError')

      if (isNetworkError) {
        setAuthStatus('authorized')
        verifyInFlight.current = false
        void fetchCenter()
        return
      }

      verifyInFlight.current = false
      redirectToLogin()
    }
  }, [centerId, fetchCenter, redirectToLogin, router])

  useEffect(() => {
    verifyAndFetch()
  // Re-verify only when the center changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId])

  const handleLogout = () => {
    clearAdminSessionCache()
    invalidateAdminFetchCache()
    invalidateNotificationsCache()
    localStorage.removeItem('adminToken')
    localStorage.removeItem('centerId')
    void clearServerSession('admin')
    setAuthStatus('redirecting')
    router.replace('/admin/login')
  }

  if (authStatus === 'redirecting') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    )
  }

  if (authStatus === 'loading' && !center) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verifying access...</p>
        </div>
      </div>
    )
  }

  return (
    <AdminCenterProvider
      value={{
        center,
        centerId,
        catalogCoursesAvailable: Boolean(center?.catalogCoursesAvailable),
      }}
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminSidebar
          centerId={centerId}
          centerName={typeof center?.name === 'string' ? center.name : undefined}
          catalogCoursesAvailable={Boolean(center?.catalogCoursesAvailable)}
          logoLight={typeof center?.logo_url === 'string' ? center.logo_url : undefined}
          logoDark={typeof center?.logo_dark_url === 'string' ? center.logo_dark_url : undefined}
          permissions={permissions}
        />

        {/* Main content */}
        <div className="lg:pl-64">
          <AdminHeader
            title={title}
            centerId={centerId}
            centerName={typeof center?.name === 'string' ? center.name : undefined}
            profileHref={`/admin/${centerId}/profile`}
            userType="admin"
            onLogout={handleLogout}
          />

          {/* Page content */}
          <main className="p-4 sm:p-6 lg:p-8">
            {backUrl && (
              <Link
                href={backUrl}
                className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4 transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Link>
            )}
            {children}
          </main>
        </div>
      </div>
    </AdminCenterProvider>
  )
}
