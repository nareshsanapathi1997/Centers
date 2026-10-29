'use client'

import { withBasePath } from './with-base-path'

export type LogoutScope = 'admin' | 'super-admin' | 'student'

/**
 * Clears the httpOnly session cookie (and revokes the server-side session).
 * Failures are swallowed — logout must never leave the user stuck.
 */
export async function clearServerSession(scope: LogoutScope): Promise<void> {
  try {
    await fetch(withBasePath(`/api/auth/logout?scope=${scope}`), {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
    })
  } catch {
    // Ignore — the client-side session is cleared regardless.
  }
}
