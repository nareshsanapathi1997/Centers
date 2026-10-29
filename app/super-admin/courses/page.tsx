'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useMemo, useState } from 'react'
import CoursesManagementPanel from '@/components/admin/CoursesManagementPanel'
import { GraduationCap } from 'lucide-react'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Select } from '@/components/forms'

interface CenterOption {
  id: number
  name: string
  slug: string
  is_active: boolean
}

export default function SuperAdminCoursesPage() {
  const [centers, setCenters] = useState<CenterOption[]>([])
  const [loadingCenters, setLoadingCenters] = useState(true)
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null)
  const [activeOnly, setActiveOnly] = useState(true)

  useEffect(() => {
    const fetchCenters = async () => {
      try {        
        const response = await superAdminFetch('/api/super-admin/centers')

        if (!response.ok) return

        const data = (await response.json()) as CenterOption[]
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
        setCenters(sorted)

        const firstActive = sorted.find((c) => c.is_active)
        if (firstActive) setSelectedCenterId(firstActive.id)
        else if (sorted.length > 0) setSelectedCenterId(sorted[0].id)
      } catch (error) {
        console.error('Error fetching centers:', error)
      } finally {
        setLoadingCenters(false)
      }
    }

    void fetchCenters()
  }, [])

  const visibleCenters = useMemo(
    () => (activeOnly ? centers.filter((c) => c.is_active) : centers),
    [activeOnly, centers],
  )

  const selectedCenter = visibleCenters.find((c) => c.id === selectedCenterId) ?? null

  useEffect(() => {
    if (visibleCenters.length === 0) {
      setSelectedCenterId(null)
      return
    }
    if (!selectedCenterId || !visibleCenters.some((c) => c.id === selectedCenterId)) {
      setSelectedCenterId(visibleCenters[0].id)
    }
  }, [visibleCenters, selectedCenterId])

  if (loadingCenters) {
    return (
      <SuperAdminPageShell>
        <div className="space-y-6">
          <PageHeader
            title={<span className="flex items-center gap-2"><GraduationCap className="h-7 w-7" />Courses Management</span>}
            description="Add, edit, and delete course cards for any center."
            breadcrumbs={[{ label: 'Super Admin', href: '/super-admin' }, { label: 'Courses' }]}
          />
          <LoadingSkeleton variant="cards" rows={3} />
        </div>
      </SuperAdminPageShell>
    )
  }

  return (
    <SuperAdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={<span className="flex items-center gap-2"><GraduationCap className="h-7 w-7" />Courses Management</span>}
          description="Add, edit, and delete course cards for any center."
          breadcrumbs={[{ label: 'Super Admin', href: '/super-admin' }, { label: 'Courses' }]}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveOnly(true)}
                className={`admin-btn admin-btn--sm ${activeOnly ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
              >
                Active centers
              </button>
              <button
                type="button"
                onClick={() => setActiveOnly(false)}
                className={`admin-btn admin-btn--sm ${!activeOnly ? 'admin-btn--primary' : 'admin-btn--secondary'}`}
              >
                All centers
              </button>
            </div>
          }
        />

        <div className="admin-card p-4">
          <label className="admin-form-label" htmlFor="sa-courses-center">Select center</label>
          <Select
            id="sa-courses-center"
            value={selectedCenterId ?? ''}
            onChange={(e) => setSelectedCenterId(parseInt(e.target.value, 10))}
            className="max-w-xl"
          >
            {visibleCenters.length === 0 ? (
              <option value="">No centers available</option>
            ) : (
              visibleCenters.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name} ({center.slug}){center.is_active ? '' : ' — Inactive'}
                </option>
              ))
            )}
          </Select>
          {selectedCenter ? (
            <p className="mt-2 text-xs text-[var(--cm-color-text-muted)]">
              Managing courses for <strong>{selectedCenter.name}</strong>
            </p>
          ) : null}
        </div>

        {selectedCenterId ? (
          <CoursesManagementPanel
            key={selectedCenterId}
            centerId={String(selectedCenterId)}
            mode="super-admin"
          />
        ) : (
          <EmptyState
            icon={GraduationCap}
            title="No center selected"
            message="Select an active center to manage courses."
          />
        )}
      </div>
    </SuperAdminPageShell>
  )
}
