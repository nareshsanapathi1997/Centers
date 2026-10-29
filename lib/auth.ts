import { NextRequest } from 'next/server'
import pool from './db'
import {
  getCachedAdminAuth,
  getCachedSuperAdminAuth,
  setCachedAdminAuth,
  setCachedSuperAdminAuth,
} from './server-auth-cache'
import { verifyJwt } from './jwt'
import { ADMIN_COOKIE, SUPER_ADMIN_COOKIE, readToken } from './auth-cookies'
import { isAdminSessionValid } from './admin-sessions'

export interface AdminTokenPayload {
  adminId: number
  centerId: number
  jti?: string
}

export interface SuperAdminTokenPayload {
  adminId: number
  isSuperAdmin: true
  jti?: string
}

async function assertAdminSession(jti: string | undefined): Promise<boolean> {
  if (!jti) return false
  try {
    return await isAdminSessionValid(jti)
  } catch (error: unknown) {
    // Table not migrated yet — fail closed once the schema is expected.
    const code = (error as { code?: string } | null)?.code
    if (code === '42P01') {
      console.warn('[auth] admin_sessions table missing; run npm run db:migrate')
      return true
    }
    throw error
  }
}

/**
 * Verify admin token and return payload
 */
export function verifyAdminToken(token: string): AdminTokenPayload | null {
  return verifyJwt<AdminTokenPayload>(token)
}

/**
 * Verify super admin token and return payload
 */
export function verifySuperAdminToken(token: string): SuperAdminTokenPayload | null {
  const decoded = verifyJwt<SuperAdminTokenPayload>(token)
  return decoded?.isSuperAdmin ? decoded : null
}

/**
 * Get admin token from the Authorization header, falling back to the httpOnly
 * session cookie.
 */
export function getAdminToken(request: NextRequest): string | null {
  return readToken(request, ADMIN_COOKIE)
}

/** Same as `getAdminToken` but for the super-admin session. */
export function getSuperAdminToken(request: NextRequest): string | null {
  return readToken(request, SUPER_ADMIN_COOKIE)
}

/**
 * Verify admin is authorized to access a specific center
 */
export async function verifyAdminAccess(
  token: string,
  centerId: number
): Promise<{ authorized: boolean; adminId?: number; error?: string }> {
  const cached = getCachedAdminAuth(token, centerId)
  if (cached) return cached

  const payload = verifyAdminToken(token)
  
  if (!payload) {
    return { authorized: false, error: 'Invalid token' }
  }

  if (!(await assertAdminSession(payload.jti))) {
    return { authorized: false, error: 'Session expired or revoked' }
  }

  const tokenCenterId = Number(payload.centerId)
  const requestedCenterId = Number(centerId)
  
  if (tokenCenterId !== requestedCenterId) {
    return { authorized: false, error: 'Unauthorized: You can only access your own center' }
  }

  try {
    const result = await pool.query(
      'SELECT id, center_id, is_active FROM center_admins WHERE id = $1',
      [payload.adminId]
    )

    if (result.rows.length === 0) {
      return { authorized: false, error: 'Admin not found' }
    }

    const admin = result.rows[0]
    
    if (!admin.is_active) {
      return { authorized: false, error: 'Admin account is inactive' }
    }

    const adminCenterId = Number(admin.center_id)
    if (adminCenterId !== requestedCenterId) {
      return { authorized: false, error: 'Unauthorized: Center mismatch' }
    }

    const authResult = { authorized: true as const, adminId: payload.adminId }
    setCachedAdminAuth(token, centerId, authResult)
    return authResult
  } catch (error) {
    console.error('Error verifying admin access:', error)
    return { authorized: false, error: 'Database error' }
  }
}

/**
 * Verify super admin access for API routes
 * Returns { isValid: boolean } for compatibility with email templates and SEO routes
 */
export async function verifySuperAdminAccess(
  request: NextRequest
): Promise<{ isValid: boolean; adminId?: number; error?: string }> {
  const token = getSuperAdminToken(request)
  if (!token) {
    return { isValid: false, error: 'No token provided' }
  }

  const cached = getCachedSuperAdminAuth(token)
  if (cached?.authorized) {
    return { isValid: true, adminId: cached.adminId }
  }

  const payload = verifySuperAdminToken(token)
  if (!payload) {
    return { isValid: false, error: 'Invalid token' }
  }

  if (!(await assertAdminSession(payload.jti))) {
    return { isValid: false, error: 'Session expired or revoked' }
  }

  try {
    const result = await pool.query(
      'SELECT id, is_active FROM super_admins WHERE id = $1',
      [payload.adminId]
    )

    if (result.rows.length === 0) {
      return { isValid: false, error: 'Super admin not found' }
    }

    const admin = result.rows[0]
    if (!admin.is_active) {
      return { isValid: false, error: 'Super admin account is inactive' }
    }

    setCachedSuperAdminAuth(token, { authorized: true, adminId: payload.adminId })
    return { isValid: true, adminId: payload.adminId }
  } catch (error) {
    console.error('Error verifying super admin:', error)
    return { isValid: false, error: 'Database error' }
  }
}
