'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import { clearStudentSession, setStudentSession, studentFetch } from '@/lib/student-api'
import {
  clearStudentSessionCache,
  getStudentSessionCache,
  setStudentSessionCache,
  type StudentSessionStudent,
} from '@/lib/student-session-cache'

export type StudentPortalStudent = StudentSessionStudent

type StudentPortalContextValue = {
  centerId: number
  centerSlug: string
  centerName: string
  student: StudentPortalStudent | null
  authOk: boolean
  refreshStudent: () => Promise<void>
}

const StudentPortalContext = createContext<StudentPortalContextValue | null>(null)

export function useStudentPortal() {
  const ctx = useContext(StudentPortalContext)
  if (!ctx) {
    throw new Error('useStudentPortal must be used within StudentPortalProvider')
  }
  return ctx
}

/** Optional hook for pages that may render outside the provider. */
export function useStudentPortalOptional() {
  return useContext(StudentPortalContext)
}

type ProviderProps = {
  children: React.ReactNode
  centerId: number
  centerSlug: string
  centerName: string
  /** When true, show a full-page spinner only if there is no cached session. */
  blockUntilVerified?: boolean
}

export default function StudentPortalProvider({
  children,
  centerId,
  centerSlug,
  centerName,
  blockUntilVerified = true,
}: ProviderProps) {
  const router = useRouter()
  const cached = getStudentSessionCache(centerId)
  const [student, setStudent] = useState<StudentPortalStudent | null>(cached?.student ?? null)
  const [authOk, setAuthOk] = useState(Boolean(cached))
  const [loading, setLoading] = useState(!cached)
  const verifyingRef = useRef(false)
  const centerSlugRef = useRef(centerSlug)
  centerSlugRef.current = centerSlug

  const failAuth = useCallback(() => {
    clearStudentSession()
    setAuthOk(false)
    setStudent(null)
    router.replace(`/${centerSlugRef.current}/student/login`)
  }, [router])

  const applyStudent = useCallback(
    (data: { fullName?: string; email?: string; emailVerified?: boolean } | null | undefined) => {
      const next: StudentPortalStudent = {
        fullName: data?.fullName || '',
        email: data?.email || '',
        emailVerified: Boolean(data?.emailVerified),
      }
      setStudent(next)
      setStudentSessionCache(centerId, next)
      setStudentSession(centerId)
      setAuthOk(true)
    },
    [centerId]
  )

  const verify = useCallback(async () => {
    if (verifyingRef.current) return
    verifyingRef.current = true

    const storedCenterId = localStorage.getItem('studentCenterId')
    if (storedCenterId && String(centerId) !== storedCenterId) {
      failAuth()
      verifyingRef.current = false
      setLoading(false)
      return
    }

    try {
      const res = await studentFetch('/api/student/verify', {
        method: 'POST',
        body: JSON.stringify({ centerId }),
      })
      const data = await res.json()
      if (!res.ok || !data.authorized) {
        failAuth()
        return
      }
      applyStudent(data.student)
    } catch {
      // Network or navigation abort ? do not revoke the server session
    } finally {
      verifyingRef.current = false
      setLoading(false)
    }
  }, [applyStudent, centerId, failAuth])

  // Verify once per centerId mount — do not re-run when callback identities churn.
  useEffect(() => {
    void verify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId])

  const refreshStudent = useCallback(async () => {
    verifyingRef.current = false
    await verify()
  }, [verify])

  const value = useMemo<StudentPortalContextValue>(
    () => ({
      centerId,
      centerSlug,
      centerName,
      student,
      authOk,
      refreshStudent,
    }),
    [authOk, centerId, centerName, centerSlug, refreshStudent, student]
  )

  if (blockUntilVerified && loading && !authOk) {
    return (
      <div className="sp-portal__loading">
        <div className="sp-portal__spinner" role="status" aria-label="Loading" />
      </div>
    )
  }

  if (blockUntilVerified && !authOk && !loading) {
    return null
  }

  return <StudentPortalContext.Provider value={value}>{children}</StudentPortalContext.Provider>
}

export { clearStudentSessionCache, getStudentSessionCache }
