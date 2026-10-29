'use client'

import { useEffect, useState } from 'react'
import { authenticatedFetch } from '@/lib/admin-api'
import { useAdminFetch } from '@/lib/use-admin-fetch'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminFormField from '@/components/admin/AdminFormField'
import PageFormActions from '@/components/admin/PageFormActions'
import PageHeader from '@/components/ui/PageHeader'
import ImageUpload from '@/components/admin/ImageUpload'
import { Switch } from '@/components/forms'
import { Info, Plus, X } from 'lucide-react'
import { toast } from '@/lib/admin-ui-store'

export default function AboutManagement({ params }: { params: { centerId: string } }) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: 'Get To Know Us',
    heading: '',
    description: '',
    subtext: '',
    feature_list: [] as string[],
    image_url: '',
    is_active: true,
  })
  const [newFeature, setNewFeature] = useState('')

  const { data: aboutData, loading, error, refetch: fetchAboutSection } = useAdminFetch<any>(
    `admin-about-${params.centerId}`,
    `/api/admin/about?centerId=${params.centerId}`,
    { auth: true },
  )

  useEffect(() => {
    if (!aboutData) return
    setFormData({
      title: aboutData.title || 'Get To Know Us',
      heading: aboutData.heading || '',
      description: aboutData.description || '',
      subtext: aboutData.subtext || '',
      feature_list: Array.isArray(aboutData.feature_list) ? aboutData.feature_list : [],
      image_url: aboutData.image_url || '',
      is_active: aboutData.is_active !== undefined ? aboutData.is_active : true,
    })
  }, [aboutData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await authenticatedFetch('/api/admin/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          center_id: parseInt(params.centerId, 10),
        }),
      })

      if (response.ok) {
        toast.success('About section saved successfully')
        void fetchAboutSection(true)
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || 'Failed to save about section')
      }
    } catch (err) {
      console.error('Error saving about section:', err)
      toast.error('Error saving about section')
    } finally {
      setSaving(false)
    }
  }

  const addFeature = () => {
    if (!newFeature.trim()) return
    setFormData({
      ...formData,
      feature_list: [...formData.feature_list, newFeature.trim()],
    })
    setNewFeature('')
  }

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      feature_list: formData.feature_list.filter((_, i) => i !== index),
    })
  }

  const updateFeature = (index: number, value: string) => {
    const updated = [...formData.feature_list]
    updated[index] = value
    setFormData({ ...formData, feature_list: updated })
  }

  return (
    <AdminPageShell loading={loading} error={error} onRetry={() => void fetchAboutSection(true)}>
      <div className="space-y-6">
        <PageHeader
          title="About Section"
          description="Customize the Get To Know Us section on your website"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'About' },
          ]}
        />

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Manage &quot;Get To Know Us&quot; Section
              </p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                Customize the title, heading, description, features, and subtext for the About
                section on your website.
              </p>
            </div>
          </div>
        </div>

        <form id="about-section-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="admin-page-form-card space-y-4">
            <h3 className="admin-page-form-card__title">Section Content</h3>
            <p className="admin-page-form-card__desc">Copy shown on the public About block.</p>

            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Section Title (Small Text)" className="admin-form-col-6">
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="admin-form-control"
                  placeholder="Get To Know Us"
                />
              </AdminFormField>
              <AdminFormField label="Main Heading" className="admin-form-col-6">
                <input
                  type="text"
                  value={formData.heading}
                  onChange={(e) => setFormData({ ...formData, heading: e.target.value })}
                  className="admin-form-control"
                  placeholder="Empowering Students with Quality Education at EduSphere"
                />
              </AdminFormField>
            </div>

            <AdminFormField
              label="Description"
              hint="You can use multiple paragraphs by separating them with line breaks."
            >
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="admin-form-control"
                placeholder="Enter description about your center..."
              />
            </AdminFormField>

            <AdminFormField label="Subtext (Bottom Text)">
              <input
                type="text"
                value={formData.subtext}
                onChange={(e) => setFormData({ ...formData, subtext: e.target.value })}
                className="admin-form-control"
                placeholder="Committed to academic excellence, student success, and long-term career growth"
              />
            </AdminFormField>

            <Switch
              id="about-is-active"
              label="Section is active"
              hint="Inactive sections are hidden on the public website"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="admin-page-form-card space-y-3">
            <h3 className="admin-page-form-card__title">Feature List</h3>
            <p className="admin-page-form-card__desc">Bullet points shown next to the about copy.</p>

            {formData.feature_list.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-blue-600 dark:text-blue-400" aria-hidden>
                  <i className="ri-check-double-line text-lg" />
                </span>
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => updateFeature(index, e.target.value)}
                  className="admin-form-control flex-1"
                  placeholder="Enter feature text"
                />
                <button
                  aria-label="Remove feature"
                  type="button"
                  onClick={() => removeFeature(index)}
                  className="admin-btn admin-btn--icon admin-btn--icon-danger"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addFeature()
                  }
                }}
                className="admin-form-control flex-1"
                placeholder="Add new feature..."
              />
              <button type="button" onClick={addFeature} className="admin-btn admin-btn--primary admin-btn--sm">
                <Plus className="h-5 w-5" />
                Add
              </button>
            </div>
          </div>

          <div className="admin-page-form-card">
            <h3 className="admin-page-form-card__title">Section Image</h3>
            <p className="admin-page-form-card__desc">Optional image for the about section.</p>
            <ImageUpload
              label="About Section Image"
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
              folder="about"
              centerId={params.centerId}
              helpText="Optional: Upload an image for the about section"
            />
          </div>

          <PageFormActions
            formId="about-section-form"
            isSubmitting={saving}
            status="Changes apply to your center website after save."
          />
        </form>
      </div>
    </AdminPageShell>
  )
}
