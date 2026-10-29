'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import { RefreshCw, Navigation } from 'lucide-react'

interface GlobalSetting {
  id: number
  setting_key: string
  setting_value: string
  setting_type: string
  description?: string
}

export default function NavigationSettings() {
  const [settings, setSettings] = useState<GlobalSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await superAdminFetch('/api/super-admin/global-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const persistSetting = async (key: string, value: string) => {
    let response = await superAdminFetch('/api/super-admin/global-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setting_key: key, setting_value: value }),
    })

    if (!response.ok && response.status === 404) {
      response = await superAdminFetch('/api/super-admin/global-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: key,
          setting_value: value,
          setting_type: 'boolean',
          description: '',
        }),
      })
    }

    if (!response.ok) {
      throw new Error(`Failed to update ${key}`)
    }

    const updatedSetting = await response.json()
    setSettings((prev) => {
      const existing = prev.find((s) => s.setting_key === key)
      if (existing) {
        return prev.map((s) => (s.setting_key === key ? updatedSetting : s))
      }
      return [...prev, updatedSetting]
    })
  }

  const isEnabled = (key: string) => {
    const setting = settings.find((s) => s.setting_key === key)
    return setting?.setting_value === 'true'
  }

  /** Top bar is shown only when both settings are true (legacy DB has two keys). */
  const topQuickLinksBarOn =
    isEnabled('header_top_nav_enabled') && isEnabled('header_dropdown_enabled')

  const setTopQuickLinksBar = async (enabled: boolean) => {
    setSaving(true)
    setMessage(null)
    const value = enabled ? 'true' : 'false'
    try {
      await persistSetting('header_top_nav_enabled', value)
      await persistSetting('header_dropdown_enabled', value)
      setMessage({
        type: 'success',
        text: enabled
          ? 'Top quick links bar enabled. Refresh the center site to see it.'
          : 'Top bar hidden. Only the main menu below the logo will show.',
      })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update setting' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading navigation settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Header Navigation Settings</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            One switch controls the thin strip above the logo. The main menu (Home, Courses, Results…) is always below the logo.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="flex items-center gap-2 admin-btn admin-btn--secondary admin-btn--sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Navigation className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top quick links bar</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                About Us, Our Results, Our Centres, Careers@EduSphere — edited under Menu Items
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                Show top quick links bar (above logo)
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>OFF (recommended):</strong> no extra strip — only logo + main menu.
                <br />
                <strong>ON:</strong> thin bar above logo with About Us, Our Results, etc.
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                Phone number is not shown in a separate top strip anymore. It stays on the Contact page and in center details.
              </p>
            </div>
            <button
              onClick={() => setTopQuickLinksBar(!topQuickLinksBarOn)}
              disabled={saving}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ml-4 shrink-0 ${
                topQuickLinksBarOn ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  topQuickLinksBarOn ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <Navigation className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300">Where to edit menus</h4>
            <p>
              <strong>Main menu</strong> (Home, Courses → courses section, Results, Contact…): always on the dark bar with the logo.
            </p>
            <p>
              <strong>Top bar</strong> (About Us, Our Results, <strong>Courses dropdown</strong> with School / College sections, Careers@EduSphere):
              only when the toggle above is ON. Edit under <strong>Settings → Menu Items</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
