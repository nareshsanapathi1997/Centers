'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import { RefreshCw, Image } from 'lucide-react'
import ImageUpload from '@/components/admin/ImageUpload'

interface GlobalSetting {
  id: number
  setting_key: string
  setting_value: string
  setting_type: string
  description?: string
}

export default function HeroSectionSettings() {
  const [settings, setSettings] = useState<GlobalSetting[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [heroBackgroundImage, setHeroBackgroundImage] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await superAdminFetch('/api/super-admin/global-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        const heroBg = data.find((s: GlobalSetting) => s.setting_key === 'hero_common_background_image')
        if (heroBg) {
          setHeroBackgroundImage(heroBg.setting_value)
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMenuItems = async () => {
    try {
      const response = await superAdminFetch('/api/super-admin/header-menu')
      if (response.ok) {
        const data = await response.json()
        setMenuItems(data)
      }
    } catch (error) {
      console.error('Error fetching menu items:', error)
    }
  }

  const updateSetting = async (key: string, value: string) => {
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
            description: key === 'hero_common_background_image' 
              ? 'Common background image URL for all hero slides'
              : ''
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
        if (key === 'hero_common_background_image') {
          setHeroBackgroundImage(value)
        }
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Hero Section Settings</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage common background image for all hero slides
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

        {/* Background Image */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Image className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Common Background Image
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This background image will be used for all hero slides across all centers
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <ImageUpload
              label=""
              value={heroBackgroundImage}
              onChange={(url) => {
                setHeroBackgroundImage(url)
                updateSetting('hero_common_background_image', url)
              }}
              folder="hero"
              centerId={undefined}
              helpText="Recommended size: 1920x800 pixels"
            />
          </div>
        </div>

      </div>
  )
}
