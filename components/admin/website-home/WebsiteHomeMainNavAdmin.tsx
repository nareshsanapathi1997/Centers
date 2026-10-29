'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react'
import { withBasePath } from '@/lib/with-base-path'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import AdminFormField from '@/components/admin/AdminFormField'
import { confirmDialog } from '@/lib/admin-ui-store'

type NavRow = { id: number; label: string; href: string; display_order: number; is_active: boolean }

export default function WebsiteHomeMainNavAdmin() {
  const [rows, setRows] = useState<NavRow[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<NavRow | null>(null)
  const [form, setForm] = useState({ label: '', href: '/', display_order: 0, is_active: true })

  const api = withBasePath('/api/super-admin/website-home/main-nav')
  const load = async () => {
    setLoading(true)
    const res = await fetch(api, { credentials: 'include' })
    setRows(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const syncFromSections = async () => {
    if (!(await confirmDialog('Replace all main nav links with links generated from enabled sections?'))) return
    setSyncing(true)
    await superAdminFetch('/api/super-admin/website-home/main-nav/sync-from-sections', { method: 'POST' })
    setSyncing(false)
    load()
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editing ? withBasePath(`/api/super-admin/website-home/main-nav/${editing.id}`) : api
    await fetch(url, {
        credentials: 'include',
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setOpen(false)
    load()
  }

  const remove = async (id: number) => {
    if (!(await confirmDialog({ message: 'Delete this link?', destructive: true }))) return
    await superAdminFetch(`/api/super-admin/website-home/main-nav/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <SuperAdminPageShell loading={loading}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Main Navigation</h2>
            <p className="text-sm text-gray-500">
              Canonical links for the website home header. Live site uses auto-generated nav from
              enabled sections; click Sync to update this list to match.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={syncFromSections}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync from sections
            </button>
            <button type="button" onClick={() => { setEditing(null); setForm({ label: '', href: '/', display_order: rows.length, is_active: true }); setOpen(true) }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
              <Plus className="h-4 w-4" /> Add link
            </button>
          </div>
        </div>
        <table className="min-w-full rounded-xl border dark:border-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs uppercase">Label</th>
              <th className="px-4 py-2 text-left text-xs uppercase">Href</th>
              <th className="px-4 py-2 text-left text-xs uppercase">Order</th>
              <th className="px-4 py-2 text-right text-xs uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t dark:border-gray-700">
                <td className="px-4 py-2">{row.label}</td>
                <td className="px-4 py-2 font-mono text-sm">{row.href}</td>
                <td className="px-4 py-2">{row.display_order}</td>
                <td className="px-4 py-2 text-right">
                  <button aria-label="Edit" type="button" onClick={() => { setEditing(row); setForm({ label: row.label, href: row.href, display_order: row.display_order, is_active: row.is_active }); setOpen(true) }} className="p-1 text-blue-600"><Edit className="h-4 w-4" /></button>
                  <button aria-label="Delete" type="button" onClick={() => remove(row.id)} className="p-1 text-red-600"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FormModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit link' : 'Add link'}
        footer={
          <FormModalActions
            formId="website-home-main-nav-form"
            onCancel={() => setOpen(false)}
            submitLabel="Save"
          />
        }
      >
        <form id="website-home-main-nav-form" onSubmit={save} noValidate>
          <AdminFormField label="Label" required>
            <input className="admin-form-control" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
          </AdminFormField>
          <AdminFormField label="Href" hint="Use /#section for home anchors, /chennai for center pages">
            <input className="admin-form-control" value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} required />
          </AdminFormField>
          <AdminFormField label="Display order">
            <input type="number" className="admin-form-control" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
          </AdminFormField>
        </form>
      </FormModal>
    </SuperAdminPageShell>
  )
}
