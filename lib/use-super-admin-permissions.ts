'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useCallback, useEffect, useState } from 'react'
import {
  getCachedSuperAdminPermissions,
  setCachedSuperAdminPermissions
} from '@/lib/admin-panel-session-cache'
import type { SuperAdminAccessGrant } from '@/lib/super-admin-access'
import { getMenuPermissionResource } from '@/lib/super-admin-permission-catalog'

export type SuperAdminAccessState = {
  fullAccess: boolean
  roleId: number | null
  roleName: string | null
  grants: SuperAdminAccessGrant[]
}

const FULL_ACCESS: SuperAdminAccessState = {
  fullAccess: true,
  roleId: null,
  roleName: null,
  grants: []
}

export function hasGrant(
  access: SuperAdminAccessState | null,
  resource: string,
  action: 'read' | 'create' | 'update' | 'delete' | 'approve' | 'export' = 'read'
) {
  if (!access || access.fullAccess) return true
  return access.grants.some((grant) => grant.resource === resource && grant.action === action)
}

export function canShowSuperAdminMenuItem(access: SuperAdminAccessState | null, href: string) {
  const resource = getMenuPermissionResource(href)
  if (!resource) return true
  return hasGrant(access, resource, 'read')
}

/** Pass `{ enabled: false }` from components shared with the centre admin panel. */
export function useSuperAdminPermissions({ enabled = true }: { enabled?: boolean } = {}) {
  const [access, setAccess] = useState<SuperAdminAccessState | null>(null)
  const [loading, setLoading] = useState(enabled)

  const fetchAccess = useCallback(async () => {
    if (!enabled) return
    const cached = getCachedSuperAdminPermissions<SuperAdminAccessState>()
    if (cached) {
      setAccess(cached)
      setLoading(false)
      return
    }

    try {
      const response = await superAdminFetch('/api/super-admin/me/permissions')

      if (response.ok) {
        const data = await response.json()
        setCachedSuperAdminPermissions(data)
        setAccess(data)
      } else {
        setAccess(FULL_ACCESS)
      }
    } catch {
      setAccess(FULL_ACCESS)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    fetchAccess()
  }, [fetchAccess])

  return { access, loading, refreshAccess: fetchAccess }
}
