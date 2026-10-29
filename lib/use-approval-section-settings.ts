'use client'

import { useEffect, useState } from 'react'
import { authenticatedFetch } from '@/lib/admin-api'
import type { ApprovalSectionKey } from '@/lib/approval-sections'

const DEFAULT_SETTINGS: Record<ApprovalSectionKey, boolean> = {
  news: true,
  alert: true,
  hero: true,
}

export function useApprovalSectionSettings(centerId: string) {
  const [settings, setSettings] = useState<Record<ApprovalSectionKey, boolean>>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await authenticatedFetch(
          `/api/admin/approval-settings?centerId=${centerId}`
        )

        if (response.ok && !cancelled) {
          const data = await response.json()
          setSettings({ ...DEFAULT_SETTINGS, ...(data.settings || {}) })
        }
      } catch (error) {
        console.error('Error loading approval section settings:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [centerId])

  const isApprovalEnabled = (key: ApprovalSectionKey) => settings[key] !== false

  return { settings, loading, isApprovalEnabled }
}
