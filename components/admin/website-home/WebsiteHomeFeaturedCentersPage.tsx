'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { withBasePath } from '@/lib/with-base-path'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'

type FeaturedRow = {
  id: number
  center_id: number
  center_name: string
  center_slug: string
  display_order: number
}

type CenterOption = { id: number; name: string; slug: string }

export default function WebsiteHomeFeaturedCentersPage() {
  const [rows, setRows] = useState<FeaturedRow[]>([])
  const [centers, setCenters] = useState<CenterOption[]>([])
  const [centerId, setCenterId] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [featuredRes, centersRes] = await Promise.all([
      superAdminFetch('/api/super-admin/website-home/featured-centers'),
      superAdminFetch('/api/super-admin/centers'),
    ])
    const featured = await featuredRes.json()
    const centerList = await centersRes.json()
    setRows(Array.isArray(featured) ? featured : [])
    setCenters(Array.isArray(centerList) ? centerList : [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const add = async () => {
    if (!centerId) return
    await superAdminFetch('/api/super-admin/website-home/featured-centers', {
      method: 'POST',
      body: JSON.stringify({ center_id: Number(centerId), display_order: rows.length }),
    })
    setCenterId('')
    load()
  }

  const remove = async (id: number) => {
    await superAdminFetch(`/api/super-admin/website-home/featured-centers/${id}`, {
      method: 'DELETE',
    })
    load()
  }

  const usedIds = new Set(rows.map((r) => r.center_id))

  return (
    <SuperAdminPageShell loading={loading}>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Featured Centers</h2>
          <p className="text-sm text-gray-500">Centers shown in the &quot;Our Centers&quot; section on website home</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={centerId}
            onChange={(e) => setCenterId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
          >
            <option value="">Select center...</option>
            {centers
              .filter((c) => !usedIds.has(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.slug})
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={!centerId}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Center
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Center</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">Slug</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-sm">{row.center_name}</td>
                  <td className="px-4 py-3 text-sm">{row.center_slug}</td>
                  <td className="px-4 py-3 text-right">
                    <button aria-label="Delete" type="button" onClick={() => remove(row.id)} className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminPageShell>
  )
}
