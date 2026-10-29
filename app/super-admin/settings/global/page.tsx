'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import { RefreshCw, Settings as SettingsIcon, Info } from 'lucide-react'

interface GlobalSetting {
  id: number
  setting_key: string
  setting_value: string
  setting_type: string
  description?: string
}

export default function GlobalSettings() {
  const [settings, setSettings] = useState<GlobalSetting[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Global Settings</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View all system-wide configuration settings
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

        {/* Settings List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <SettingsIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  All Global Settings
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  System-wide configuration values
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {settings.length === 0 ? (
              <div className="text-center py-8">
                <SettingsIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No global settings found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {settings.map((setting) => (
                  <div
                    key={setting.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        {setting.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {setting.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                            {setting.setting_type}
                          </span>
                          <span className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1 rounded border border-gray-200 dark:border-gray-700">
                            {setting.setting_value}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                About Global Settings
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                These are system-wide settings that apply to all centers. Most settings can be managed 
                through their respective sections in the Settings menu. This page provides a read-only 
                view of all global configuration values.
              </p>
            </div>
          </div>
        </div>
      </div>
  )
}
