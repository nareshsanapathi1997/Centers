'use client'

import { useEffect, useState } from 'react'
import { superAdminFetch } from '@/lib/super-admin-api'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/forms'
import { Plus, Trash2, ArrowUp, ArrowDown, MapPin } from 'lucide-react'
import { toast, confirmDialog } from '@/lib/admin-ui-store'

interface NearbyCenter {
  id: number
  center_id: number
  nearby_center_id: number
  display_order: number
  nearby_center_name: string
  nearby_center_slug: string
}

interface Center {
  id: number
  name: string
  slug: string
}

export default function NearbyCentersManagement() {
  const [centers, setCenters] = useState<Center[]>([])
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null)
  const [nearbyCenters, setNearbyCenters] = useState<NearbyCenter[]>([])
  const [availableCenters, setAvailableCenters] = useState<Center[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchCenters()
  }, [])

  useEffect(() => {
    if (selectedCenterId) {
      fetchNearbyCenters(selectedCenterId)
      fetchAvailableCenters(selectedCenterId)
    }
  }, [selectedCenterId])

  const fetchCenters = async () => {
    try {
      const response = await superAdminFetch('/api/super-admin/centers')
      const data = await response.json()
      setCenters(data)
      if (data.length > 0 && !selectedCenterId) {
        setSelectedCenterId(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching centers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNearbyCenters = async (centerId: number) => {
    try {
      const response = await superAdminFetch(`/api/super-admin/nearby-centers?centerId=${centerId}`)
      const data = await response.json()
      setNearbyCenters(data)
    } catch (error) {
      console.error('Error fetching nearby centers:', error)
    }
  }

  const fetchAvailableCenters = async (centerId: number) => {
    try {
      const response = await superAdminFetch('/api/super-admin/centers')
      const allCenters = await response.json()
      const nearbyResponse = await superAdminFetch(
        `/api/super-admin/nearby-centers?centerId=${centerId}`
      )
      const nearby = await nearbyResponse.json()
      const nearbyIds = nearby.map((nc: NearbyCenter) => nc.nearby_center_id)
      const available = allCenters.filter(
        (c: Center) => c.id !== centerId && !nearbyIds.includes(c.id)
      )
      setAvailableCenters(available)
    } catch (error) {
      console.error('Error fetching available centers:', error)
    }
  }

  const handleAddNearbyCenter = async (nearbyCenterId: number) => {
    if (!selectedCenterId) return

    try {
      const response = await superAdminFetch('/api/super-admin/nearby-centers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          center_id: selectedCenterId,
          nearby_center_id: nearbyCenterId,
          display_order: nearbyCenters.length,
        }),
      })

      if (response.ok) {
        fetchNearbyCenters(selectedCenterId)
        fetchAvailableCenters(selectedCenterId)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add nearby center')
      }
    } catch (error) {
      console.error('Error adding nearby center:', error)
      toast.error('Failed to add nearby center')
    }
  }

  const handleRemoveNearbyCenter = async (nearbyCenterId: number) => {
    if (!selectedCenterId) return

    if (
      !(await confirmDialog({
        message: 'Are you sure you want to remove this nearby center?',
        destructive: true,
      }))
    ) {
      return
    }

    try {
      const response = await superAdminFetch(
        `/api/super-admin/nearby-centers?centerId=${selectedCenterId}&nearbyCenterId=${nearbyCenterId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        fetchNearbyCenters(selectedCenterId)
        fetchAvailableCenters(selectedCenterId)
      } else {
        toast.error('Failed to remove nearby center')
      }
    } catch (error) {
      console.error('Error removing nearby center:', error)
      toast.error('Failed to remove nearby center')
    }
  }

  const handleMoveOrder = async (id: number, direction: 'up' | 'down') => {
    const index = nearbyCenters.findIndex((nc) => nc.id === id)
    if (index === -1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= nearbyCenters.length) return

    const updated = [...nearbyCenters]
    const temp = updated[index].display_order
    updated[index].display_order = updated[newIndex].display_order
    updated[newIndex].display_order = temp

    try {
      await Promise.all([
        superAdminFetch('/api/super-admin/nearby-centers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            center_id: selectedCenterId,
            nearby_center_id: updated[index].nearby_center_id,
            display_order: updated[index].display_order,
          }),
        }),
        superAdminFetch('/api/super-admin/nearby-centers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            center_id: selectedCenterId,
            nearby_center_id: updated[newIndex].nearby_center_id,
            display_order: updated[newIndex].display_order,
          }),
        }),
      ])

      setNearbyCenters(updated.sort((a, b) => a.display_order - b.display_order))
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Failed to update order')
    }
  }

  const filteredAvailableCenters = availableCenters.filter((center) =>
    center.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedCenter = centers.find((c) => c.id === selectedCenterId)

  if (loading) {
    return (
      <SuperAdminPageShell>
        <div className="space-y-6">
          <PageHeader
            title={
              <span className="flex items-center gap-2">
                <MapPin className="h-7 w-7" />
                Manage Nearby Centers
              </span>
            }
            description='Select which centers appear in the "Our Centers" section for each center'
            breadcrumbs={[
              { label: 'Super Admin', href: '/super-admin' },
              { label: 'Nearby Centers' },
            ]}
          />
          <LoadingSkeleton variant="cards" rows={4} />
        </div>
      </SuperAdminPageShell>
    )
  }

  return (
    <SuperAdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <MapPin className="h-7 w-7" />
              Manage Nearby Centers
            </span>
          }
          description='Select which centers appear in the "Our Centers" section for each center'
          breadcrumbs={[
            { label: 'Super Admin', href: '/super-admin' },
            { label: 'Nearby Centers' },
          ]}
        />

        <div className="admin-card p-4">
          <label className="admin-form-label mb-2 block" htmlFor="nearby-host-center">
            Select Center
          </label>
          <Select
            id="nearby-host-center"
            value={selectedCenterId || ''}
            onChange={(e) => setSelectedCenterId(Number(e.target.value))}
            aria-label="Select center"
          >
            <option value="">Select a center...</option>
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </Select>
        </div>

        {selectedCenterId ? (
          <>
            <div className="admin-card overflow-hidden">
              <div className="border-b border-[var(--cm-color-border)] px-6 py-4">
                <h2 className="text-lg font-semibold">Nearby Centers for: {selectedCenter?.name}</h2>
                <p className="mt-1 text-sm text-[var(--cm-color-text-muted)]">
                  These centers will appear in the &quot;Our Centers&quot; section
                </p>
              </div>
              <div className="p-6">
                {nearbyCenters.length === 0 ? (
                  <EmptyState
                    icon={MapPin}
                    title="No nearby centers"
                    message="No nearby centers configured. Add centers from the list below."
                    compact
                  />
                ) : (
                  <div className="space-y-3">
                    {nearbyCenters.map((nc, index) => (
                      <div
                        key={nc.id}
                        className="flex items-center justify-between rounded-lg border border-[var(--cm-color-border)] p-4"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="text-primary" size={20} />
                          <div>
                            <h3 className="font-medium">{nc.nearby_center_name}</h3>
                            <p className="text-sm text-[var(--cm-color-text-muted)]">
                              Order: {nc.display_order}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(nc.id, 'up')}
                            disabled={index === 0}
                            className="admin-btn admin-btn--icon"
                            title="Move up"
                            aria-label="Move up"
                          >
                            <ArrowUp size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(nc.id, 'down')}
                            disabled={index === nearbyCenters.length - 1}
                            className="admin-btn admin-btn--icon"
                            title="Move down"
                            aria-label="Move down"
                          >
                            <ArrowDown size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveNearbyCenter(nc.nearby_center_id)}
                            className="admin-btn admin-btn--icon admin-btn--icon-danger"
                            title="Remove"
                            aria-label="Remove"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="admin-card overflow-hidden">
              <div className="border-b border-[var(--cm-color-border)] px-6 py-4">
                <h2 className="text-lg font-semibold">Add Nearby Centers</h2>
                <p className="mt-1 text-sm text-[var(--cm-color-text-muted)]">
                  Select centers to add as nearby centers
                </p>
              </div>
              <div className="space-y-4 p-6">
                <Input
                  type="search"
                  placeholder="Search centers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search available centers"
                />
                {filteredAvailableCenters.length === 0 ? (
                  <EmptyState
                    icon={MapPin}
                    title="Nothing to add"
                    message={
                      searchQuery
                        ? 'No centers found matching your search'
                        : 'All centers are already added as nearby centers'
                    }
                    compact
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAvailableCenters.map((center) => (
                      <div
                        key={center.id}
                        className="flex items-center justify-between rounded-lg border border-[var(--cm-color-border)] p-4"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="text-[var(--cm-color-text-muted)]" size={20} />
                          <span className="font-medium">{center.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddNearbyCenter(center.id)}
                          className="admin-btn admin-btn--icon"
                          title="Add as nearby center"
                          aria-label={`Add ${center.name}`}
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </SuperAdminPageShell>
  )
}
