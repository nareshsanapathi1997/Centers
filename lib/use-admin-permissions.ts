'use client'
import { authenticatedFetch } from '@/lib/admin-api'

import { useCallback, useEffect, useState } from 'react'
import {
  getCachedAdminPermissions,
  setCachedAdminPermissions
} from '@/lib/admin-panel-session-cache'
import type { AdminAccessGrant } from '@/lib/admin-access'
import { canShowAdminMenuItem as canShowAdminMenuItemFromCatalog } from '@/lib/admin-permission-catalog'

export type AdminAccessState = {
  fullAccess: boolean
  roleIds: number[]
  roleNames: string[]
  grants: AdminAccessGrant[]
}

const FULL_ACCESS: AdminAccessState = {
  fullAccess: true,
  roleIds: [],
  roleNames: [],
  grants: []
}

export function hasAdminGrant(
  access: AdminAccessState | null,
  resource: string,
  action: 'read' | 'create' | 'update' | 'delete' | 'approve' | 'export' = 'read'
) {
  if (!access || access.fullAccess) return true
  return access.grants.some((grant) => grant.resource === resource && grant.action === action)
}

export function canShowAdminMenuItem(access: AdminAccessState | null, href: string) {
  return canShowAdminMenuItemFromCatalog(access, href)
}

export function useAdminPermissions(centerId: string) {
  const [access, setAccess] = useState<AdminAccessState | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAccess = useCallback(async () => {
    if (!centerId) {
      setAccess(FULL_ACCESS)
      setLoading(false)
      return
    }

    const cached = getCachedAdminPermissions<AdminAccessState>(centerId)
    if (cached) {
      setAccess(cached)
      setLoading(false)
      return
    }

    try {
      const response = await authenticatedFetch(`/api/admin/me/permissions?centerId=${encodeURIComponent(centerId)}`)

      if (response.ok) {
        const data = await response.json()
        setCachedAdminPermissions(centerId, data)
        setAccess(data)
      } else {
        setAccess(FULL_ACCESS)
      }
    } catch {
      setAccess(FULL_ACCESS)
    } finally {
      setLoading(false)
    }
  }, [centerId])

  useEffect(() => {
    fetchAccess()
  }, [fetchAccess])

  return { access, loading, refreshAccess: fetchAccess }
}
