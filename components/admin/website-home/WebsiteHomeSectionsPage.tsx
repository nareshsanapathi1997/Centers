'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Settings } from 'lucide-react'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import { WEBSITE_HOME_SECTION_LABELS } from '@/lib/website-home-nav'

type SectionRow = {
  id: number
  section_key: string
  is_enabled: boolean
  display_order: number
}

export default function WebsiteHomeSectionsPage() {
  const [sections, setSections] = useState<SectionRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSections = async () => {
    setLoading(true)
    try {
      const response = await superAdminFetch('/api/super-admin/website-home/sections')
      const data = await response.json()
      setSections(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSections()
  }, [])

  const toggle = async (section: SectionRow) => {
    const response = await superAdminFetch('/api/super-admin/website-home/sections', {
      method: 'PATCH',
      body: JSON.stringify({ id: section.id, is_enabled: !section.is_enabled }),
    })

    if (response.ok) fetchSections()
  }

  return (
    <SuperAdminPageShell loading={loading}>
      <div className="space-y-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Section Toggles</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enable or disable sections on the website home page
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sections
              .filter((section) => !['centers', 'senior_faculty'].includes(section.section_key))
              .map((section) => (
              <div key={section.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  {section.is_enabled ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {WEBSITE_HOME_SECTION_LABELS[section.section_key as keyof typeof WEBSITE_HOME_SECTION_LABELS] ||
                        section.section_key.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-xs text-gray-500">Order: {section.display_order}</p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={section.is_enabled}
                    onChange={() => toggle(section)}
                  />
                  <div className="peer h-7 w-14 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-6 after:w-6 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-gray-700" />
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SuperAdminPageShell>
  )
}
