'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { withBasePath } from '@/lib/with-base-path'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import AdminFormField from '@/components/admin/AdminFormField'
import PageFormActions from '@/components/admin/PageFormActions'
import PageHeader from '@/components/ui/PageHeader'
import ImageUpload from '@/components/admin/ImageUpload'
import AdminButton from '@/components/admin/AdminButton'
import { Switch } from '@/components/forms'
import WebsiteHomeResourceManager from '@/components/admin/website-home/WebsiteHomeResourceManager'
import { toast } from '@/lib/admin-ui-store'
import {
  getWebsiteHomeResource,
  type WebsiteHomeFieldDef
} from '@/lib/website-home-resource-registry'

type AboutTab = 'overview' | 'philosophy' | 'promoters'

const TAB_CONFIG: { id: AboutTab; label: string; previewPath: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', previewPath: '/about', icon: 'ri-file-list-line' },
  {
    id: 'philosophy',
    label: 'Our Philosophy',
    previewPath: '/about/philosophy',
    icon: 'ri-lightbulb-line'
  },
  {
    id: 'promoters',
    label: 'Meet the Promoters',
    previewPath: '/about/promoters',
    icon: 'ri-team-line'
  },
]

const TAB_SECTIONS: Record<AboutTab, { title: string; keys: string[] }[]> = {
  overview: [
    {
      title: 'Hero banner',
      keys: ['overview_hero_title', 'overview_hero_highlight', 'overview_hero_subtitle']
    },
    {
      title: 'Page content',
      keys: ['title', 'heading', 'description', 'subtext', 'feature_list', 'image_url']
    },
    {
      title: 'Image badge overlay',
      keys: ['overview_badge_years', 'overview_badge_label']
    },
    { title: 'Visibility', keys: ['is_active'] },
  ],
  philosophy: [
    {
      title: 'Hero banner',
      keys: ['philosophy_hero_title', 'philosophy_hero_highlight', 'philosophy_hero_subtitle']
    },
    {
      title: 'Page content',
      keys: [
        'philosophy_eyebrow',
        'philosophy_heading',
        'philosophy_description',
        'philosophy_feature_list',
        'philosophy_image_url',
      ]
    },
  ],
  promoters: [
    {
      title: 'Hero banner',
      keys: ['promoters_hero_title', 'promoters_hero_highlight', 'promoters_hero_subtitle']
    },
    {
      title: 'Intro section',
      keys: ['promoters_eyebrow', 'promoters_section_heading', 'promoters_section_intro']
    },
    {
      title: 'Profiles section labels',
      keys: [
        'promoters_message_label',
        'promoters_directors_heading',
        'promoters_directors_subtitle',
      ]
    },
  ]
}

function defaultValueForField(field: WebsiteHomeFieldDef): unknown {
  if (field.type === 'boolean') return true
  if (field.type === 'number') return 0
  if (field.type === 'string-list') return ''
  return ''
}

function rowToForm(row: Record<string, unknown> | null, fields: WebsiteHomeFieldDef[]) {
  const form: Record<string, unknown> = {}
  for (const field of fields) {
    const raw = row?.[field.key]
    if (field.type === 'string-list') {
      form[field.key] = Array.isArray(raw) ? raw.join('\n') : ''
    } else if (field.type === 'boolean') {
      form[field.key] = raw !== false
    } else {
      form[field.key] = raw ?? defaultValueForField(field)
    }
  }
  return form
}

function parseTab(value: string | null): AboutTab {
  if (value === 'philosophy' || value === 'promoters') return value
  return 'overview'
}

export default function WebsiteAboutUsAdmin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const aboutDef = getWebsiteHomeResource('about')
  const leadershipDef = getWebsiteHomeResource('leadership')
  const fields = aboutDef?.fields ?? []

  const activeTab = parseTab(searchParams.get('tab'))
  const [formData, setFormData] = useState<Record<string, unknown>>(() => rowToForm(null, fields))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const apiBase = withBasePath('/api/super-admin/website-home/about')
  const fieldByKey = useMemo(() => new Map(fields.map((field) => [field.key, field])), [fields])

  const fetchRow = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(apiBase, { credentials: 'include' })
      const data = await response.json()
      const row = Array.isArray(data) ? data[0] : null
      setFormData(rowToForm(row, fields))
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [apiBase, fields])

  useEffect(() => {
    fetchRow()
  }, [fetchRow])

  const selectTab = (tab: AboutTab) => {
    router.replace(withBasePath(`/super-admin/website-home/about-us?tab=${tab}`), { scroll: false })
  }

  const tabSections = useMemo(() => {
    return TAB_SECTIONS[activeTab]
      .map((section) => ({
        title: section.title,
        fields: section.keys
          .map((key) => fieldByKey.get(key))
          .filter((field): field is WebsiteHomeFieldDef => Boolean(field))
      }))
      .filter((section) => section.fields.length > 0)
  }, [activeTab, fieldByKey])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(apiBase, {
        credentials: 'include',
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error || 'Failed to save')
        return
      }

      const saved = await response.json()
      setFormData(rowToForm(saved, fields))
      toast.success('Saved. Public pages refresh within ~2 minutes.')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const setField = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const renderField = (field: WebsiteHomeFieldDef) => {
    const value = formData[field.key]
    const spanClass = field.type === 'textarea' || field.type === 'string-list' ? 'lg:col-span-2' : ''

    if (field.type === 'image') {
      return (
        <div key={field.key} className={`${spanClass}`}>
          <AdminFormField label={field.label} hint={field.helpText}>
            <ImageUpload
              label=""
              value={String(value || '')}
              onChange={(url) => setField(field.key, url)}
            />
          </AdminFormField>
        </div>
      )
    }

    if (field.type === 'boolean') {
      return (
        <div key={field.key} className={spanClass}>
          <Switch
            id={`about-${field.key}`}
            label={field.label}
            hint="Show Overview on website"
            checked={Boolean(value)}
            onCheckedChange={(checked) => setField(field.key, checked)}
          />
        </div>
      )
    }

    if (field.type === 'textarea' || field.type === 'string-list') {
      return (
        <div key={field.key} className={spanClass}>
          <AdminFormField
            label={field.label}
            hint={field.helpText || (field.type === 'string-list' ? 'One item per line' : undefined)}
          >
            <textarea
              className="admin-form-control"
              rows={field.type === 'string-list' ? 6 : 4}
              value={String(value ?? '')}
              placeholder={field.placeholder}
              onChange={(e) => setField(field.key, e.target.value)}
            />
          </AdminFormField>
        </div>
      )
    }

    return (
      <div key={field.key} className={spanClass}>
        <AdminFormField label={field.label} hint={field.helpText}>
          <input
            type="text"
            className="admin-form-control"
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(e) => setField(field.key, e.target.value)}
          />
        </AdminFormField>
      </div>
    )
  }

  const activeTabConfig = TAB_CONFIG.find((tab) => tab.id === activeTab) ?? TAB_CONFIG[0]
  const formId = `about-us-${activeTab}-form`
  const submitLabel =
    activeTab === 'promoters' ? 'Save page content' : `Save ${activeTabConfig.label}`

  const formBody = (
    <>
      {tabSections.map((section) => (
        <div key={section.title} className="space-y-4">
          <h4 className="border-b border-gray-100 pb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
            {section.title}
          </h4>
          <div className="grid gap-4 lg:grid-cols-2">{section.fields.map(renderField)}</div>
        </div>
      ))}

      <PageFormActions
        formId={formId}
        isSubmitting={saving}
        submitLabel={submitLabel}
        status="Public pages refresh within ~2 minutes after save."
      />
    </>
  )

  return (
    <SuperAdminPageShell loading={loading}>
      <div className="space-y-6">
        <PageHeader
          title="About Us Pages"
          description="Manage Overview, Our Philosophy, and Meet the Promoters from one place."
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Website Home', href: '/super-admin/website-home' },
            { label: 'About Us' },
          ]}
          actions={
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => window.open(withBasePath(activeTabConfig.previewPath), '_blank', 'noopener,noreferrer')}
              icon={<ExternalLink className="h-4 w-4" />}
            >
              Preview {activeTabConfig.label}
            </AdminButton>
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                  isActive
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40'
                    : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <i className={`${tab.icon} text-lg`} aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-gray-900 dark:text-white">{tab.label}</span>
                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                    {tab.previewPath}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {activeTab !== 'promoters' ? (
          <form
            id={formId}
            onSubmit={save}
            className="admin-page-form-card space-y-6"
          >
            <div className="border-b border-gray-100 pb-4 dark:border-gray-700">
              <h3 className="admin-page-form-card__title">{activeTabConfig.label}</h3>
              <p className="admin-page-form-card__desc" style={{ marginBottom: 0 }}>
                Public page: <code className="text-xs">{activeTabConfig.previewPath}</code>
              </p>
            </div>
            {formBody}
          </form>
        ) : (
          <div className="space-y-6">
            <form id={formId} onSubmit={save} className="admin-page-form-card space-y-6">
              <div className="border-b border-gray-100 pb-4 dark:border-gray-700">
                <h3 className="admin-page-form-card__title">Promoters page content</h3>
                <p className="admin-page-form-card__desc" style={{ marginBottom: 0 }}>
                  Hero and intro for <code className="text-xs">/about/promoters</code>. Profile cards
                  are managed below.
                </p>
              </div>
              {formBody}
            </form>

            {leadershipDef ? (
              <div className="admin-page-form-card">
                <div className="mb-4">
                  <h3 className="admin-page-form-card__title">Promoter profiles</h3>
                  <p className="admin-page-form-card__desc">
                    Photo, role, bio, and shared message (message title/content on the first profile
                    appears in the quote block).
                  </p>
                </div>
                <WebsiteHomeResourceManager resource={leadershipDef} embedded />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </SuperAdminPageShell>
  )
}
