'use client'

import { useEffect, useState } from 'react'
import { withBasePath } from '@/lib/with-base-path'
import { authenticatedFetch } from '@/lib/admin-api'
import { useAdminCenter } from '@/components/admin/AdminCenterContext'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminFormField from '@/components/admin/AdminFormField'
import PageFormActions from '@/components/admin/PageFormActions'
import PageHeader from '@/components/ui/PageHeader'
import ImageUpload from '@/components/admin/ImageUpload'
import AdminButton from '@/components/admin/AdminButton'
import { Switch } from '@/components/forms'
import { Plus, X } from 'lucide-react'
import { toast } from '@/lib/admin-ui-store'

export default function CenterSettings({ params }: { params: { centerId: string } }) {
  const adminCenter = useAdminCenter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: [] as string[],
    address: '',
    working_hours: '',
    google_rating: '',
    google_rating_url: '',
    map_embed_url: '',
    logo_url: '',
    logo_dark_url: '',
    favicon_url: '',
    social_facebook: '',
    social_twitter: '',
    social_instagram: '',
    social_linkedin: '',
    social_whatsapp: '',
    social_telegram: '',
    is_active: true,
  })

  useEffect(() => {
    if (!adminCenter?.center) return
    applyCenterToForm(adminCenter.center)
    setLoading(false)
  }, [adminCenter?.center])

  const applyCenterToForm = (data: Record<string, unknown>) => {
    setFormData({
      name: String(data.name || ''),
      description: String(data.description || ''),
      email: String(data.email || ''),
      phone: (Array.isArray(data.phone) ? data.phone : []) as string[],
      address: String(data.address || ''),
      working_hours: String(data.working_hours || ''),
      google_rating: data.google_rating != null ? String(data.google_rating) : '',
      google_rating_url: String(data.google_rating_url || ''),
      map_embed_url: String(data.map_embed_url || ''),
      logo_url: String(data.logo_url || ''),
      logo_dark_url: String(data.logo_dark_url || ''),
      favicon_url: String(data.favicon_url || ''),
      social_facebook: String(data.social_facebook || ''),
      social_twitter: String(data.social_twitter || ''),
      social_instagram: String(data.social_instagram || ''),
      social_linkedin: String(data.social_linkedin || ''),
      social_whatsapp: String(data.social_whatsapp || ''),
      social_telegram: String(data.social_telegram || ''),
      is_active: data.is_active !== false,
    })
  }

  const fetchCenter = async () => {
    try {
      const response = await fetch(withBasePath(`/api/admin/center/${params.centerId}`), {
        credentials: 'include',
      })
      const data = await response.json()
      applyCenterToForm(data)
    } catch (error) {
      console.error('Error fetching center:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const phoneArray = formData.phone.filter((p) => p.trim() !== '')
      const response = await authenticatedFetch(`/api/admin/center/${params.centerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: phoneArray,
          google_rating: formData.google_rating ? parseFloat(formData.google_rating) : null,
        }),
      })

      if (response.ok) {
        toast.success('Center settings saved successfully')
        void fetchCenter()
      } else {
        const error = await response.json().catch(() => ({}))
        toast.error(error.error || 'Failed to save center settings')
      }
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('Error saving center settings')
    } finally {
      setSaving(false)
    }
  }

  const addPhoneField = () => {
    setFormData({ ...formData, phone: [...formData.phone, ''] })
  }

  const updatePhone = (index: number, value: string) => {
    const newPhone = [...formData.phone]
    newPhone[index] = value
    setFormData({ ...formData, phone: newPhone })
  }

  const removePhone = (index: number) => {
    setFormData({ ...formData, phone: formData.phone.filter((_, i) => i !== index) })
  }

  return (
    <AdminPageShell loading={loading}>
      <div className="space-y-6">
        <PageHeader
          title="Center Settings"
          description="Update center profile, contact details, and branding"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Settings' },
          ]}
        />

        <form id="center-settings-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="admin-page-form-card space-y-4">
            <h3 className="admin-page-form-card__title">Profile</h3>
            <p className="admin-page-form-card__desc">Core identity and contact details.</p>

            <AdminFormField label="Center Name" required>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="admin-form-control"
              />
            </AdminFormField>

            <AdminFormField label="Description">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="admin-form-control"
                rows={3}
              />
            </AdminFormField>

            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Email" className="admin-form-col-6">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="admin-form-control"
                />
              </AdminFormField>
              <AdminFormField label="Working Hours" className="admin-form-col-6">
                <input
                  type="text"
                  value={formData.working_hours}
                  onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
                  className="admin-form-control"
                  placeholder="e.g., Mon - Fri: 9:00 am - 6:00 pm"
                />
              </AdminFormField>
            </div>

            <AdminFormField label="Phone Numbers">
              <div className="space-y-2">
                {formData.phone.map((phone, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => updatePhone(index, e.target.value)}
                      className="admin-form-control flex-1"
                      placeholder="Phone number"
                    />
                    <AdminButton
                      type="button"
                      variant="icon-danger"
                      aria-label="Remove phone"
                      onClick={() => removePhone(index)}
                      icon={<X className="h-4 w-4" />}
                    />
                  </div>
                ))}
                <AdminButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addPhoneField}
                  icon={<Plus className="h-4 w-4" />}
                >
                  Add phone
                </AdminButton>
              </div>
            </AdminFormField>

            <AdminFormField label="Address">
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="admin-form-control"
                rows={2}
              />
            </AdminFormField>

            <Switch
              id="center-is-active"
              label="Center is active"
              hint="Inactive centers are hidden from public listings"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="admin-page-form-card space-y-4">
            <h3 className="admin-page-form-card__title">Branding</h3>
            <p className="admin-page-form-card__desc">
              Center logos and favicon. Global Super Admin logos may override these.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <ImageUpload
                label="Logo (Light)"
                value={formData.logo_url}
                onChange={(url) => setFormData({ ...formData, logo_url: url })}
                folder="logos"
                centerId={params.centerId}
                helpText="Used on light backgrounds"
              />
              <ImageUpload
                label="Logo (Dark)"
                value={formData.logo_dark_url}
                onChange={(url) => setFormData({ ...formData, logo_dark_url: url })}
                folder="logos"
                centerId={params.centerId}
                helpText="Used on dark backgrounds"
              />
              <ImageUpload
                label="Favicon"
                value={formData.favicon_url}
                onChange={(url) => setFormData({ ...formData, favicon_url: url })}
                folder="favicons"
                centerId={params.centerId}
                helpText="Browser tab icon"
              />
            </div>
          </div>

          <div className="admin-page-form-card space-y-4">
            <h3 className="admin-page-form-card__title">Maps & Ratings</h3>
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Google Rating" className="admin-form-col-6">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.google_rating}
                  onChange={(e) => setFormData({ ...formData, google_rating: e.target.value })}
                  className="admin-form-control"
                />
              </AdminFormField>
              <AdminFormField label="Google Rating URL" className="admin-form-col-6">
                <input
                  type="text"
                  value={formData.google_rating_url}
                  onChange={(e) => setFormData({ ...formData, google_rating_url: e.target.value })}
                  className="admin-form-control"
                />
              </AdminFormField>
            </div>
            <AdminFormField label="Map Embed URL">
              <input
                type="text"
                value={formData.map_embed_url}
                onChange={(e) => setFormData({ ...formData, map_embed_url: e.target.value })}
                className="admin-form-control"
              />
            </AdminFormField>
          </div>

          <div className="admin-page-form-card space-y-4">
            <h3 className="admin-page-form-card__title">Social Links</h3>
            <div className="admin-form-row admin-form-row--2">
              {(
                [
                  ['social_facebook', 'Facebook'],
                  ['social_twitter', 'Twitter / X'],
                  ['social_instagram', 'Instagram'],
                  ['social_linkedin', 'LinkedIn'],
                  ['social_whatsapp', 'WhatsApp'],
                  ['social_telegram', 'Telegram'],
                ] as const
              ).map(([key, label]) => (
                <AdminFormField key={key} label={label} className="admin-form-col-6">
                  <input
                    type="text"
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="admin-form-control"
                  />
                </AdminFormField>
              ))}
            </div>
          </div>

          <PageFormActions
            formId="center-settings-form"
            isSubmitting={saving}
            status="Saves profile, branding, and social links together."
          />
        </form>
      </div>
    </AdminPageShell>
  )
}
