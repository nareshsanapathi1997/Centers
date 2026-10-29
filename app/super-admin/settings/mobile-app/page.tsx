'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import { Smartphone, Apple, Smartphone as AndroidIcon, Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { MOBILE_APP_STORE_URL, MOBILE_PLAY_STORE_URL } from '@/lib/mobile-app-links'

interface GlobalSetting {
  id: number
  setting_key: string
  setting_value: string
  setting_type: string
  description?: string
}

export default function MobileAppSettings() {
  const [settings, setSettings] = useState<GlobalSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [appStoreUrl, setAppStoreUrl] = useState('')
  const [playStoreUrl, setPlayStoreUrl] = useState('')
  const [appTitle, setAppTitle] = useState('Download Our Mobile App')
  const [appDescription, setAppDescription] = useState('Get access to study materials, practice tests, and expert guidance on the go. Download our app for iOS and Android devices.')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await superAdminFetch('/api/super-admin/global-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        
        // Extract values
        const appStore = data.find((s: GlobalSetting) => s.setting_key === 'mobile_app_store_url')
        const playStore = data.find((s: GlobalSetting) => s.setting_key === 'mobile_play_store_url')
        const title = data.find((s: GlobalSetting) => s.setting_key === 'mobile_app_title')
        const description = data.find((s: GlobalSetting) => s.setting_key === 'mobile_app_description')
        
        setAppStoreUrl(appStore?.setting_value || MOBILE_APP_STORE_URL)
        setPlayStoreUrl(playStore?.setting_value || MOBILE_PLAY_STORE_URL)
        setAppTitle(title?.setting_value || 'Download Our Mobile App')
        setAppDescription(description?.setting_value || 'Get access to study materials, practice tests, and expert guidance on the go. Download our app for iOS and Android devices.')
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: string, value: string, description: string) => {
    setSaving(true)
    setMessage(null)
    try {
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
            setting_type: 'string',
            description: description
          }),
        })
      }

      if (response.ok) {
        const updatedSetting = await response.json()
        setSettings(prev => {
          const existing = prev.find(s => s.setting_key === key)
          if (existing) {
            return prev.map(s => (s.setting_key === key ? updatedSetting : s))
          } else {
            return [...prev, updatedSetting]
          }
        })
        setMessage({ type: 'success', text: 'Setting updated successfully!' })
      } else {
        setMessage({ type: 'error', text: 'Failed to update setting' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating setting' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      // Update all settings
      await Promise.all([
        updateSetting('mobile_app_store_url', appStoreUrl, 'App Store download URL for iOS devices'),
        updateSetting('mobile_play_store_url', playStoreUrl, 'Google Play Store download URL for Android devices'),
        updateSetting('mobile_app_title', appTitle, 'Title text for mobile app download section'),
        updateSetting('mobile_app_description', appDescription, 'Description text for mobile app download section'),
      ])
      
      setMessage({ type: 'success', text: 'All mobile app settings saved successfully!' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving settings' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mobile App Settings</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage mobile app download links and content for the footer section
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

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* App Store URL */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Apple className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                App Store URL (iOS)
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                URL for downloading the app from Apple App Store
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <input
            type="url"
            value={appStoreUrl}
            onChange={(e) => setAppStoreUrl(e.target.value)}
            placeholder={MOBILE_APP_STORE_URL}
            className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Example: {MOBILE_APP_STORE_URL}
          </p>
        </div>
      </div>

      {/* Play Store URL */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <AndroidIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Google Play Store URL (Android)
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                URL for downloading the app from Google Play Store
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <input
            type="url"
            value={playStoreUrl}
            onChange={(e) => setPlayStoreUrl(e.target.value)}
            placeholder={MOBILE_PLAY_STORE_URL}
            className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Example: {MOBILE_PLAY_STORE_URL}
          </p>
        </div>
      </div>

      {/* Content Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Section Content
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Customize the title and description text displayed in the footer
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="admin-form-label">
              Section Title
            </label>
            <input
              type="text"
              value={appTitle}
              onChange={(e) => setAppTitle(e.target.value)}
              placeholder="Download Our Mobile App"
              className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="admin-form-label">
              Section Description
            </label>
            <textarea
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
              placeholder="Get access to study materials, practice tests, and expert guidance on the go..."
              rows={3}
              className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Save All Settings</span>
            </>
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Mobile App Download Links
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              These settings control the mobile app download links displayed in the footer section 
              across all centers. When URLs are provided, the download buttons will be clickable and 
              will open the respective app store pages. If URLs are left empty, the buttons will still 
              be displayed but will not be clickable.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
