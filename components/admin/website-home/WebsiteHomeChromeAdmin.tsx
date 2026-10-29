'use client'

import { useEffect, useState } from 'react'
import { superAdminFetch } from '@/lib/super-admin-api'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import AdminFormField from '@/components/admin/AdminFormField'
import PageFormActions from '@/components/admin/PageFormActions'
import PageHeader from '@/components/ui/PageHeader'
import { Switch } from '@/components/forms'
import { toast } from '@/lib/admin-ui-store'

type CenterOption = { id: number; name: string; slug: string }

const TEXT_FIELDS = [
  { key: 'website_site_name', label: 'Site name' },
  { key: 'website_site_tagline', label: 'Footer tagline' },
  { key: 'website_header_phone', label: 'Header phone' },
  { key: 'website_header_whatsapp', label: 'WhatsApp number or URL' },
  { key: 'website_header_email', label: 'Email' },
  { key: 'website_social_facebook', label: 'Facebook URL' },
  { key: 'website_social_twitter', label: 'X / Twitter URL' },
  { key: 'website_social_instagram', label: 'Instagram URL' },
  { key: 'website_social_linkedin', label: 'LinkedIn URL' },
  { key: 'website_footer_copyright', label: 'Copyright text' },
] as const

export default function WebsiteHomeChromeAdmin() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [centers, setCenters] = useState<CenterOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      superAdminFetch('/api/super-admin/website-home/chrome-settings').then((r) => r.json()),
      superAdminFetch('/api/super-admin/centers').then((r) => r.json()),
    ])
      .then(([chrome, centerList]) => {
        setValues(typeof chrome === 'object' && chrome ? chrome : {})
        setCenters(Array.isArray(centerList) ? centerList : [])
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await superAdminFetch('/api/super-admin/website-home/chrome-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (res.ok) toast.success('Chrome settings saved')
      else toast.error('Failed to save settings')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const topBarEnabled = values.website_header_top_enabled === 'true'

  return (
    <SuperAdminPageShell loading={loading} error={error} onRetry={load}>
      <form id="website-chrome-form" onSubmit={save} className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Website Header & Footer"
          description="Contact, social links, and branding for the main website home only (not center pages)"
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Website Home', href: '/super-admin/website-home' },
            { label: 'Chrome' },
          ]}
        />

        <div className="admin-page-form-card space-y-4">
          <AdminFormField
            label="Branding center"
            hint="Used for hero enquiry form, logos fallback, and SEO. Leave empty to use the first active center."
          >
            <select
              className="admin-form-control"
              value={values.website_home_branding_center_slug ?? ''}
              onChange={(e) =>
                setValues({ ...values, website_home_branding_center_slug: e.target.value })
              }
            >
              <option value="">First active center (default)</option>
              {centers.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name} ({c.slug})
                </option>
              ))}
            </select>
          </AdminFormField>

          <Switch
            id="website-header-top-enabled"
            label="Show header-top bar"
            hint="Social icons and theme switcher in the thin top strip. Main navbar is always shown below the logo."
            checked={topBarEnabled}
            onCheckedChange={(checked) =>
              setValues({
                ...values,
                website_header_top_enabled: checked ? 'true' : 'false',
              })
            }
          />

          {TEXT_FIELDS.map((field) => (
            <AdminFormField key={field.key} label={field.label}>
              <input
                className="admin-form-control"
                value={values[field.key] ?? ''}
                onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
              />
            </AdminFormField>
          ))}
        </div>

        <PageFormActions
          formId="website-chrome-form"
          isSubmitting={saving}
          status="Changes appear on the homepage immediately after save."
        />
      </form>
    </SuperAdminPageShell>
  )
}
