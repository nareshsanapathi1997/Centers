'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Image as ImageIcon, Moon, Sun, Layout } from 'lucide-react'
import { superAdminFetch } from '@/lib/super-admin-api'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import ImageUpload from '@/components/admin/ImageUpload'
import AdminButton from '@/components/admin/AdminButton'
import { toast } from '@/lib/admin-ui-store'

interface GlobalSetting {
  id: number
  setting_key: string
  setting_value: string
  setting_type: string
  description?: string
}

export default function LogoFaviconSettings() {
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [logoLight, setLogoLight] = useState('')
  const [logoDark, setLogoDark] = useState('')
  const [logoFooter, setLogoFooter] = useState('')
  const [favicon, setFavicon] = useState('')
  const [error, setError] = useState<unknown>(null)

  const fetchSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await superAdminFetch('/api/super-admin/global-settings')
      if (!response.ok) {
        throw new Error('Failed to load logo settings')
      }
      const data = await response.json()
      const logoLightSetting = data.find((s: GlobalSetting) => s.setting_key === 'global_logo_light')
      const logoDarkSetting = data.find((s: GlobalSetting) => s.setting_key === 'global_logo_dark')
      const logoFooterSetting = data.find((s: GlobalSetting) => s.setting_key === 'global_logo_footer')
      const faviconSetting = data.find((s: GlobalSetting) => s.setting_key === 'global_favicon')

      setLogoLight(logoLightSetting?.setting_value || '')
      setLogoDark(logoDarkSetting?.setting_value || '')
      setLogoFooter(logoFooterSetting?.setting_value || '')
      setFavicon(faviconSetting?.setting_value || '')
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSettings()
  }, [])

  const updateSetting = async (key: string, value: string, description: string) => {
    setSavingKey(key)
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
            description,
          }),
        })
      }

      if (response.ok) {
        toast.success('Setting updated')
      } else {
        toast.error('Failed to update setting')
      }
    } catch {
      toast.error('Error updating setting')
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <SuperAdminPageShell loading={loading} error={error} onRetry={() => void fetchSettings()}>
      <div className="space-y-6">
        <PageHeader
          title="Logo & Favicon"
          description="Manage global logo and favicon for all centers"
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Settings', href: '/super-admin/settings' },
            { label: 'Logo & Favicon' },
          ]}
          actions={
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void fetchSettings()}
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </AdminButton>
          }
        />

        {savingKey ? (
          <p className="text-sm text-[var(--cm-color-text-muted)]">Saving {savingKey}…</p>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="admin-page-form-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <Sun className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="admin-page-form-card__title" style={{ marginBottom: 0 }}>
                  Logo (Light Mode)
                </h3>
                <p className="admin-page-form-card__desc" style={{ marginBottom: 0 }}>
                  Shown on light backgrounds
                </p>
              </div>
            </div>
            <ImageUpload
              label=""
              value={logoLight}
              onChange={(url) => {
                setLogoLight(url)
                void updateSetting('global_logo_light', url, 'Global logo URL for light mode')
              }}
              folder="logos"
              helpText="Recommended: PNG with transparent background"
            />
          </div>

          <div className="admin-page-form-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
                <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="admin-page-form-card__title" style={{ marginBottom: 0 }}>
                  Logo (Dark Mode)
                </h3>
                <p className="admin-page-form-card__desc" style={{ marginBottom: 0 }}>
                  Shown on dark backgrounds
                </p>
              </div>
            </div>
            <ImageUpload
              label=""
              value={logoDark}
              onChange={(url) => {
                setLogoDark(url)
                void updateSetting('global_logo_dark', url, 'Global logo URL for dark mode')
              }}
              folder="logos"
              helpText="Recommended: PNG with transparent background"
            />
          </div>

          <div className="admin-page-form-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-teal-100 p-2 dark:bg-teal-900/30">
                <Layout className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="admin-page-form-card__title" style={{ marginBottom: 0 }}>
                  Footer Logo
                </h3>
                <p className="admin-page-form-card__desc" style={{ marginBottom: 0 }}>
                  Website footer mark
                </p>
              </div>
            </div>
            <ImageUpload
              label=""
              value={logoFooter}
              onChange={(url) => {
                setLogoFooter(url)
                void updateSetting('global_logo_footer', url, 'Global logo URL for the footer')
              }}
              folder="logos"
              helpText="Falls back to Dark Mode logo if empty"
            />
          </div>

          <div className="admin-page-form-card">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-violet-100 p-2 dark:bg-violet-900/30">
                <ImageIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="admin-page-form-card__title" style={{ marginBottom: 0 }}>
                  Favicon
                </h3>
                <p className="admin-page-form-card__desc" style={{ marginBottom: 0 }}>
                  Browser tab icon
                </p>
              </div>
            </div>
            <ImageUpload
              label=""
              value={favicon}
              onChange={(url) => {
                setFavicon(url)
                void updateSetting('global_favicon', url, 'Global favicon URL')
              }}
              folder="favicons"
              helpText="PNG or JPG format"
            />
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
          <h4 className="font-semibold text-blue-900 dark:text-blue-300">Global Logo & Favicon</h4>
          <p className="mt-2 text-sm text-blue-700 dark:text-blue-400">
            These settings apply to all centers and can override center-specific logos for brand
            consistency. Upload high-quality images for the best display.
          </p>
        </div>
      </div>
    </SuperAdminPageShell>
  )
}
