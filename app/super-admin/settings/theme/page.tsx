'use client'

import { useCallback, useEffect, useState } from 'react'
import { Moon, RefreshCw, Sun, Palette, Info, Lock } from 'lucide-react'
import { superAdminFetch } from '@/lib/super-admin-api'
import { applyAppTheme, persistThemePolicy, type AppTheme } from '@/lib/theme-sync'
import { useTheme } from 'next-themes'

type ThemeSettings = {
  mode: AppTheme
  force: boolean
}

export default function ThemeSettingsPage() {
  const { setTheme } = useTheme()
  const [settings, setSettings] = useState<ThemeSettings>({ mode: 'light', force: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await superAdminFetch('/api/super-admin/theme-settings')
      if (response.ok) {
        const data = (await response.json()) as ThemeSettings
        setSettings({
          mode: data.mode === 'dark' ? 'dark' : 'light',
          force: Boolean(data.force),
        })
      } else {
        setMessage({ type: 'error', text: 'Failed to load theme settings' })
      }
    } catch (error) {
      console.error('Error fetching theme settings:', error)
      setMessage({ type: 'error', text: 'Error loading theme settings' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const saveSettings = async (next: ThemeSettings) => {
    setSaving(true)
    setMessage(null)
    const previous = settings
    setSettings(next)

    try {
      const response = await superAdminFetch('/api/super-admin/theme-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })

      if (response.ok) {
        const saved = (await response.json()) as ThemeSettings
        setSettings(saved)
        persistThemePolicy(saved.mode, saved.force)
        applyAppTheme(saved.mode)
        setTheme(saved.mode)
        setMessage({
          type: 'success',
          text: saved.force
            ? `Theme locked to ${saved.mode} across the entire application.`
            : `Default theme set to ${saved.mode}. Users can still toggle unless force is enabled.`,
        })
      } else {
        setSettings(previous)
        setMessage({ type: 'error', text: 'Failed to save theme settings' })
      }
    } catch (error) {
      setSettings(previous)
      setMessage({ type: 'error', text: 'Error saving theme settings' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 4000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400" />
          <p className="text-gray-600 dark:text-gray-400">Loading theme settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Application Theme</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Control light / dark mode for the whole Center Manager application
          </p>
        </div>
        <button
          type="button"
          onClick={fetchSettings}
          className="admin-btn admin-btn--secondary admin-btn--sm"
          disabled={saving}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
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
              Choose the default theme for admin panels, super admin, and public center websites.
              Enable <strong>Force theme</strong> to lock every user to that mode and hide theme toggles.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Theme mode</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current default: {settings.mode === 'dark' ? 'Dark' : 'Light'}
                {settings.force ? ' (forced)' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => saveSettings({ ...settings, mode: 'light' })}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
              settings.mode === 'light'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500/30'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30'
            }`}
          >
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Light</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Bright interface for daytime use across the application.
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => saveSettings({ ...settings, mode: 'dark' })}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
              settings.mode === 'dark'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-500/30'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30'
            }`}
          >
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Dark</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Low-light interface for admin panels and public pages.
              </p>
            </div>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Force theme for everyone</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                When enabled, users cannot switch themes. Toggles are hidden on admin and public sites.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => saveSettings({ ...settings, force: !settings.force })}
            disabled={saving}
            aria-label={settings.force ? 'Disable forced theme' : 'Enable forced theme'}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${
              settings.force ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                settings.force ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
