'use client'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { withBasePath } from '@/lib/with-base-path'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import AdminFormField from '@/components/admin/AdminFormField'
import { confirmDialog } from '@/lib/admin-ui-store'

type FooterRow = {
  id: number
  menu_group: string
  group_title?: string
  title: string
  icon_class?: string
  link_url?: string
  target_section?: string
  display_order: number
  is_active: boolean
}

export default function WebsiteHomeFooterAdmin() {
  const [rows, setRows] = useState<FooterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FooterRow | null>(null)
  const [form, setForm] = useState({
    menu_group: 'quick_links_1',
    group_title: 'Quick Links',
    title: '',
    icon_class: 'ri-arrow-right-s-line',
    link_url: '',
    target_section: '',
    display_order: 0,
    is_active: true
  })

  const load = async () => {
    setLoading(true)
    const res = await superAdminFetch('/api/super-admin/website-home/footer-menu')
    setRows(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    await superAdminFetch('/api/super-admin/website-home/footer-menu', {

      method: editing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? { id: editing.id, ...form } : form)
    })
    setOpen(false)
    load()
  }

  const remove = async (id: number) => {
    if (!(await confirmDialog({ message: 'Delete?', destructive: true }))) return
    await superAdminFetch(`/api/super-admin/website-home/footer-menu/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <SuperAdminPageShell loading={loading}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Footer Links</h2>
            <p className="text-sm text-gray-500">Website home footer quick links (separate from center footers)</p>
          </div>
          <button type="button" onClick={() => { setEditing(null); setForm({ menu_group: 'quick_links_1', group_title: 'Quick Links', title: '', icon_class: 'ri-arrow-right-s-line', link_url: '', target_section: '#about', display_order: rows.length, is_active: true }); setOpen(true) }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
            <Plus className="h-4 w-4" /> Add link
          </button>
        </div>
        <table className="min-w-full rounded-xl border dark:border-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs uppercase">Group</th>
              <th className="px-4 py-2 text-left text-xs uppercase">Title</th>
              <th className="px-4 py-2 text-left text-xs uppercase">Link</th>
              <th className="px-4 py-2 text-right text-xs uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t dark:border-gray-700">
                <td className="px-4 py-2">{row.menu_group}</td>
                <td className="px-4 py-2">{row.title}</td>
                <td className="px-4 py-2 font-mono text-sm">{row.link_url || row.target_section}</td>
                <td className="px-4 py-2 text-right">
                  <button aria-label="Edit" type="button" onClick={() => { setEditing(row); setForm({ menu_group: row.menu_group, group_title: row.group_title || '', title: row.title, icon_class: row.icon_class || '', link_url: row.link_url || '', target_section: row.target_section || '', display_order: row.display_order, is_active: row.is_active }); setOpen(true) }} className="p-1 text-blue-600"><Edit className="h-4 w-4" /></button>
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
        title={editing ? 'Edit footer link' : 'Add footer link'}
        footer={
          <FormModalActions
            formId="website-home-footer-form"
            onCancel={() => setOpen(false)}
            submitLabel="Save"
          />
        }
      >
        <form id="website-home-footer-form" onSubmit={save} noValidate>
          <AdminFormField label="Group key"><input className="admin-form-control" value={form.menu_group} onChange={(e) => setForm({ ...form, menu_group: e.target.value })} /></AdminFormField>
          <AdminFormField label="Group title"><input className="admin-form-control" value={form.group_title} onChange={(e) => setForm({ ...form, group_title: e.target.value })} /></AdminFormField>
          <AdminFormField label="Title" required><input className="admin-form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></AdminFormField>
          <AdminFormField label="Target section"><input className="admin-form-control" value={form.target_section} onChange={(e) => setForm({ ...form, target_section: e.target.value })} /></AdminFormField>
          <AdminFormField label="Link URL"><input className="admin-form-control" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></AdminFormField>
        </form>
      </FormModal>
    </SuperAdminPageShell>
  )
}
