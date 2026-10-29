'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Globe } from 'lucide-react'
import { withBasePath } from '@/lib/with-base-path'
import { withBasePathHref } from '@/lib/with-base-path'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import { WEBSITE_HOME_NAV } from '@/lib/website-home-nav'
import { WEBSITE_HOME_SECTION_LABELS } from '@/lib/website-home-nav'

export default function WebsiteHomeOverview() {
  const [sections, setSections] = useState<Array<{ section_key: string; is_enabled: boolean }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(withBasePath('/api/super-admin/website-home/sections'), { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setSections(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  const enabledCount = sections.filter((s) => s.is_enabled).length

  return (
    <SuperAdminPageShell loading={loading}>
      <div className="space-y-6">
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:border-blue-900 dark:from-blue-950/40 dark:to-indigo-950/30">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Globe className="mt-1 h-8 w-8 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Website Home Page</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  Manage the main corporate website homepage — hero, courses, testimonials, centers, and more.
                </p>
                <p className="mt-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                  {enabledCount} of {sections.length} sections enabled
                </p>
              </div>
            </div>
            <a
              href={withBasePathHref('/')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <ExternalLink className="h-4 w-4" />
              Preview Home Page
            </a>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {WEBSITE_HOME_NAV.filter((item) => item.sectionKey).map((item) => {
            const section = sections.find((s) => s.section_key === item.sectionKey)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.label}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.sectionKey
                          ? WEBSITE_HOME_SECTION_LABELS[item.sectionKey]
                          : ''}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      section?.is_enabled
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {section?.is_enabled ? 'On' : 'Off'}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </SuperAdminPageShell>
  )
}
