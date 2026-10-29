'use client'
import { authenticatedFetch } from '@/lib/admin-api'

import { useAdminFetch } from '@/lib/use-admin-fetch'
import AdminPageShell from '@/components/admin/AdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import { CheckCircle2, XCircle } from 'lucide-react'
import { toast } from '@/lib/admin-ui-store'

export default function SectionsConfig({ params }: { params: { centerId: string } }) {
  const { data: sectionsData, loading, error, refetch: fetchSections } = useAdminFetch<any[]>(
    `admin-sections-${params.centerId}`,
    `/api/admin/sections?centerId=${params.centerId}`,
    {
      parse: (json) => {
        if (Array.isArray(json)) return json
        const record = json as { sections?: unknown[] }
        return Array.isArray(record.sections) ? record.sections : []
      }
    },
  )
  const sections = sectionsData ?? []

  const toggleSection = async (sectionId: number, isEnabled: boolean) => {
    try {
      
      const response = await authenticatedFetch(`/api/admin/sections/${sectionId}`, { method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          is_enabled: !isEnabled,
          centerId: parseInt(params.centerId) })
      })

      if (response.ok) {
        fetchSections(true)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update section')
      }
    } catch (error) {
      console.error('Error updating section:', error)
      toast.error('Error updating section')
    }
  }

  return (
    <AdminPageShell loading={loading} error={error} onRetry={() => void fetchSections(true)}>
      <div className="space-y-6">
        <PageHeader
          title="Website Sections"
          description="Enable or disable website sections for your center"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Sections' },
          ]}
        />

        {/* Sections List */}
        <div className="admin-card overflow-hidden">
          <div className="divide-y divide-[var(--cm-color-border)]">
            {sections.map((section) => (
              <div
                key={section.id}
                className="px-4 py-2.5 hover:bg-[var(--cm-color-surface-muted)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div
                      className={`p-2 rounded-lg ${
                        section.is_enabled
                          ? 'bg-green-100 dark:bg-green-900/20'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    >
                      {section.is_enabled ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-0 text-lg font-semibold text-[var(--cm-color-text)] capitalize">
                        {section.section_key.replace(/_/g, ' ')}
                      </h3>
                      <p className="mt-0 text-sm text-[var(--cm-color-text-muted)]">
                        Display Order: {section.display_order}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={section.is_enabled}
                      onChange={() => toggleSection(section.id, section.is_enabled)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-300 after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminPageShell>
  )
}

