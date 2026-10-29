import { NextRequest } from 'next/server'
import { verifySuperAdminAccess } from './auth'

/**
 * Verify super admin authorization for API routes.
 * Uses the `cm_super_admin_token` cookie (not the center-admin cookie).
 */
export async function verifySuperAdminAuth(
  request: NextRequest
): Promise<{ authorized: boolean; adminId?: number; error?: string }> {
  const result = await verifySuperAdminAccess(request)
  if (!result.isValid) {
    return { authorized: false, error: result.error || 'Unauthorized' }
  }
  return { authorized: true, adminId: result.adminId }
}
