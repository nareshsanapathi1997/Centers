'use client'

import { useEffect, useState } from 'react'
import { superAdminFetch } from '@/lib/super-admin-api'
import AdminFormField from '@/components/admin/AdminFormField'
import PageFormActions from '@/components/admin/PageFormActions'
import WebsiteHomeResourceManager from '@/components/admin/website-home/WebsiteHomeResourceManager'
import type { WebsiteHomeResourceDef } from '@/lib/website-home-resource-registry'
import { toast } from '@/lib/admin-ui-store'

type WebsiteHomeHeroAdminProps = {
  resource: WebsiteHomeResourceDef
}

export default function WebsiteHomeHeroAdmin({ resource }: WebsiteHomeHeroAdminProps) {
  const [badgeBrand, setBadgeBrand] = useState('EduSphere')
  const [badgeTitle, setBadgeTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    superAdminFetch('/api/super-admin/website-home/chrome-settings')
      .then((r) => r.json())
      .then((data) => {
        if (typeof data === 'object' && data) {
          setBadgeBrand(String(data.website_hero_badge_brand || 'EduSphere'))
          setBadgeTitle(String(data.website_hero_badge_title || ''))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const saveBadge = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await superAdminFetch('/api/super-admin/website-home/chrome-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_hero_badge_brand: badgeBrand,
          website_hero_badge_title: badgeTitle,
        }),
      })
      if (res.ok) toast.success('Hero badge saved')
      else toast.error('Failed to save hero badge')
    } catch {
      toast.error('Failed to save hero badge')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <form id="hero-badge-form" onSubmit={saveBadge} className="admin-page-form-card space-y-4">
        <div>
          <h3 className="admin-page-form-card__title">Hero badge title</h3>
          <p className="admin-page-form-card__desc">
            Shown on the homepage slider badge (e.g. EduSphere + India). Separate from banner slide
            names.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminFormField label="Badge brand" hint='Left part of the badge, usually "EduSphere"'>
            <input
              className="admin-form-control"
              value={badgeBrand}
              disabled={loading}
              onChange={(e) => setBadgeBrand(e.target.value)}
            />
          </AdminFormField>
          <AdminFormField
            label="Badge title"
            hint='Right part on the homepage (e.g. "India"). Leave empty to hide the badge.'
          >
            <input
              className="admin-form-control"
              value={badgeTitle}
              disabled={loading}
              onChange={(e) => setBadgeTitle(e.target.value)}
            />
          </AdminFormField>
        </div>
        <PageFormActions
          formId="hero-badge-form"
          isSubmitting={saving}
          submitDisabled={loading}
          submitLabel="Save badge"
          sticky={false}
          status="Applies to the main website homepage slider."
        />
      </form>

      <WebsiteHomeResourceManager resource={resource} />
    </div>
  )
}
