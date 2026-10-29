'use client'
import { withBasePath } from '@/lib/with-base-path'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, RefreshCw, Info, ExternalLink } from 'lucide-react'
import type { ApprovalSectionKey } from '@/lib/approval-sections'

type ApprovalSectionRow = {
  key: ApprovalSectionKey
  label: string
  description: string
  enabled: boolean
  itemType: string
}

export default function ApprovalSettingsPage() {
  const [sections, setSections] = useState<ApprovalSectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<ApprovalSectionKey | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)      const response = await superAdminFetch('/api/super-admin/approval-settings')

      if (response.ok) {
        const data = await response.json()
        setSections(data.sections || [])
      } else {
        setMessage({ type: 'error', text: 'Failed to load approval settings' })
      }
    } catch (error) {
      console.error('Error fetching approval settings:', error)
      setMessage({ type: 'error', text: 'Error loading approval settings' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const toggleSection = async (key: ApprovalSectionKey, enabled: boolean) => {
    setSavingKey(key)
    setMessage(null)

    const nextSections = sections.map((section) =>
      section.key === key ? { ...section, enabled } : section
    )
    const settings = nextSections.reduce(
      (acc, section) => {
        acc[section.key] = section.enabled
        return acc
      },
      {} as Record<ApprovalSectionKey, boolean>
    )

    setSections(nextSections)

    try {      const response = await superAdminFetch('/api/super-admin/approval-settings', { method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings })
      })

      if (response.ok) {
        const data = await response.json()
        setSections(data.sections || nextSections)
        setMessage({
          type: 'success',
          text: enabled
            ? 'Approval enabled for this section. New changes will require your review.'
            : 'Approval disabled. Center admin changes will publish immediately.'
        })
      } else {
        await fetchSettings()
        setMessage({ type: 'error', text: 'Failed to update approval setting' })
      }
    } catch (error) {
      await fetchSettings()
      setMessage({ type: 'error', text: 'Error updating approval setting' })
    } finally {
      setSavingKey(null)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400" />
          <p className="text-gray-600 dark:text-gray-400">Loading approval settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Content Approval Settings</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Turn super admin approval ON or OFF for each content section
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/super-admin/approvals" className="admin-btn admin-btn--secondary admin-btn--sm">
            <ExternalLink className="w-4 h-4" />
            View Approvals
          </Link>
          <button onClick={fetchSettings} className="admin-btn admin-btn--secondary admin-btn--sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {message ? (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">How it works</p>
            <p>
              When approval is <strong>ON</strong>, center admin changes stay pending until you approve them in
              Content Approvals. When <strong>OFF</strong>, changes are auto-approved and go live immediately.
            </p>
            <p className="mt-2 text-blue-800 dark:text-blue-200">
              To add approval for a new section later, register it in{' '}
              <code className="text-xs bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">lib/approval-sections.ts</code>{' '}
              and wire the admin API route.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Section-wise approval</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {sections.filter((s) => s.enabled).length} of {sections.length} sections require approval
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {sections.map((section) => (
            <div
              key={section.key}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 hover:bg-gray-50/80 dark:hover:bg-gray-700/20 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{section.label}</h4>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      section.enabled
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}
                  >
                    {section.enabled ? 'Approval ON' : 'Approval OFF'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{section.description}</p>
              </div>

              <button
                type="button"
                onClick={() => toggleSection(section.key, !section.enabled)}
                disabled={savingKey === section.key}
                aria-label={`${section.enabled ? 'Disable' : 'Enable'} approval for ${section.label}`}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${
                  section.enabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                } ${savingKey === section.key ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    section.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
