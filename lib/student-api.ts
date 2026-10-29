'use client'

import { withBasePath } from './with-base-path'
import { clearServerSession } from './logout'
import { clearStudentSessionCache } from './student-session-cache'

export function getStudentCenterId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('studentCenterId')
}

/** Persist non-secret student UX state. JWT lives in the httpOnly cookie only. */
export function setStudentSession(centerId: number) {
  localStorage.setItem('studentCenterId', String(centerId))
}

export function clearStudentSession() {
  clearStudentSessionCache()
  localStorage.removeItem('studentToken')
  localStorage.removeItem('studentCenterId')
  void clearServerSession('student')
}

export async function studentFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(withBasePath(path), {
    ...init,
    credentials: 'include',
    headers,
  })
}

/** @deprecated Tokens are no longer stored client-side. */
export function getStudentToken(): string | null {
  return null
}

/** @deprecated Use studentFetch — cookies carry auth. */
export function studentAuthHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}
