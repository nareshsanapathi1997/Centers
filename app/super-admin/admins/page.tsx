'use client'
import { withBasePath } from '@/lib/with-base-path'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import AdminFormField from '@/components/admin/AdminFormField'
import { useAdminFormValidation } from '@/components/admin/useAdminFormValidation'
import type { AdminFieldRules } from '@/lib/admin-form-validation'
import { Users, Plus, Edit, Trash2, CheckCircle, XCircle, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { confirmDialog } from '@/lib/admin-ui-store'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import { Input } from '@/components/forms'

interface SuperAdmin {
  id: number
  username: string
  email: string
  full_name?: string
  is_active: boolean
  created_at: string
  updated_at?: string
  role_id?: number | null
  role_name?: string | null
}

interface SuperAdminRole {
  id: number
  name: string
}

const SUPER_ADMIN_FORM_RULES: AdminFieldRules = {
  username: [{ type: 'required' }, { type: 'minLength', value: 3, message: 'Username must be at least 3 characters.' }],
  email: [{ type: 'required' }, { type: 'email' }],
  full_name: [{ type: 'minLength', value: 2, message: 'Full name must be at least 2 characters.' }]
}

export default function SuperAdminsManagement() {
  const [admins, setAdmins] = useState<SuperAdmin[]>([])
  const [roles, setRoles] = useState<SuperAdminRole[]>([])
  const [filteredAdmins, setFilteredAdmins] = useState<SuperAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<SuperAdmin | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    is_active: true,
    role_id: ''
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, SUPER_ADMIN_FORM_RULES)

  useEffect(() => {
    fetchAdmins()
    fetchRoles()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAdmins(admins)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredAdmins(
        admins.filter(
          (admin) =>
            admin.username.toLowerCase().includes(query) ||
            admin.email.toLowerCase().includes(query) ||
            (admin.full_name && admin.full_name.toLowerCase().includes(query))
        )
      )
    }
  }, [searchQuery, admins])

  const fetchRoles = async () => {
    try {
      const response = await superAdminFetch('/api/super-admin/roles')
      if (response.ok) {
        setRoles(await response.json())
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }

  const fetchAdmins = async () => {
    try {
      const response = await superAdminFetch('/api/super-admin/admins')

      if (response.ok) {
        const data = await response.json()
        setAdmins(data)
        setFilteredAdmins(data)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to fetch super admins' })
      }
    } catch (error) {
      console.error('Error fetching admins:', error)
      setMessage({ type: 'error', text: 'Error loading super admins' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (admin?: SuperAdmin) => {
    if (admin) {
      setEditingAdmin(admin)
      setFormData({
        username: admin.username,
        email: admin.email,
        password: '', // Don't pre-fill password
        full_name: admin.full_name || '',
        is_active: admin.is_active,
        role_id: admin.role_id ? String(admin.role_id) : ''
      })
    } else {
      setEditingAdmin(null)
      setFormData({
        username: '',
        email: '',
        password: '',
        full_name: '',
        is_active: true,
        role_id: ''
      })
    }
    setShowPassword(false)
    clearErrors()
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingAdmin(null)
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      is_active: true,
      role_id: ''
    })
    setShowPassword(false)
    clearErrors()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setFormError('')

    if (!validate(formData)) {
      setSaving(false)
      return
    }

    if (!editingAdmin && (!formData.password || formData.password.trim().length < 6)) {
      setFormError('Password is required and must be at least 6 characters.')
      setSaving(false)
      return
    }

    if (editingAdmin && formData.password && formData.password.trim().length < 6) {
      setFormError('Password must be at least 6 characters.')
      setSaving(false)
      return
    }

    try {
      let response

      if (editingAdmin) {
        // Update existing admin
        response = await superAdminFetch(`/api/super-admin/admins/${editingAdmin.id}`, { method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData) })
      } else {
        // Create new admin
        response = await superAdminFetch('/api/super-admin/admins', { method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData) })
      }

      if (response.ok) {
        setMessage({ type: 'success', text: editingAdmin ? 'Super admin updated successfully!' : 'Super admin created successfully!' })
        handleCloseModal()
        fetchAdmins()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to save super admin' })
      }
    } catch (error) {
      console.error('Error saving admin:', error)
      setMessage({ type: 'error', text: 'Error saving super admin' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ message: 'Are you sure you want to delete this super admin? This action cannot be undone.', destructive: true }))) {
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const response = await superAdminFetch(`/api/super-admin/admins/${id}`, { method: 'DELETE' })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Super admin deleted successfully!' })
        fetchAdmins()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to delete super admin' })
      }
    } catch (error) {
      console.error('Error deleting admin:', error)
      setMessage({ type: 'error', text: 'Error deleting super admin' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  if (loading) {
    return (
      <SuperAdminPageShell>
        <div className="space-y-6">
          <PageHeader
            title={<span className="flex items-center gap-2"><Users className="h-7 w-7" />Super Admins</span>}
            description="Manage super admin accounts"
            breadcrumbs={[{ label: 'Super Admin', href: '/super-admin' }, { label: 'Admins' }]}
          />
          <LoadingSkeleton variant="table" rows={6} />
        </div>
      </SuperAdminPageShell>
    )
  }

  return (
    <SuperAdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={<span className="flex items-center gap-2"><Users className="h-7 w-7" />Super Admins</span>}
          description="Manage super admin accounts"
          breadcrumbs={[{ label: 'Super Admin', href: '/super-admin' }, { label: 'Admins' }]}
          actions={
            <>
              <button type="button" onClick={fetchAdmins} className="admin-btn admin-btn--secondary admin-btn--sm">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button type="button" onClick={() => handleOpenModal()} className="admin-btn admin-btn--primary admin-btn--sm">
                <Plus className="h-4 w-4" />
                Add Super Admin
              </button>
            </>
          }
        />

        {/* Message */}
        {message && (
          <div className={`flex items-center gap-3 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Search */}
        <div className="admin-card p-4">
          <div className="relative">
            <Input
              type="search"
              placeholder="Search by username, email, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search super admins"
            />
          </div>
        </div>

        {/* Admins Table */}
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      {searchQuery ? 'No super admins found matching your search' : 'No super admins found'}
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {admin.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {admin.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {admin.full_name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {admin.role_name || 'Full access (no role)'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          admin.is_active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                          {admin.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button aria-label="Edit"
                            onClick={() => handleOpenModal(admin)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button aria-label="Delete"
                            onClick={() => handleDelete(admin.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        <FormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingAdmin ? 'Edit Super Admin' : 'Add New Super Admin'}
          formError={formError}
          footer={
            <FormModalActions
              formId="super-admin-user-form"
              onCancel={handleCloseModal}
              submitLabel={editingAdmin ? 'Update' : 'Create'}
              isSubmitting={saving}
            />
          }
        >
          <form id="super-admin-user-form" onSubmit={handleSubmit} noValidate>
            <AdminFormField label="Username" htmlFor="sa-username" required error={errors.username}>
              <input
                id="sa-username"
                type="text"
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value })
                  clearFieldError('username')
                }}
                className={`admin-form-control${errors.username ? ' admin-form-control--invalid' : ''}`}
                autoComplete="username"
              />
            </AdminFormField>

            <AdminFormField label="Email" htmlFor="sa-email" required error={errors.email}>
              <input
                id="sa-email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  clearFieldError('email')
                }}
                className={`admin-form-control${errors.email ? ' admin-form-control--invalid' : ''}`}
                autoComplete="email"
              />
            </AdminFormField>

            <AdminFormField
              label={editingAdmin ? 'Password (leave empty to keep current)' : 'Password'}
              htmlFor="sa-password"
              required={!editingAdmin}
              hint={editingAdmin ? 'Minimum 6 characters when changing password.' : 'Minimum 6 characters.'}
            >
              <div className="admin-form-control-wrap">
                <input
                  id="sa-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="admin-form-control admin-form-control--with-action"
                  autoComplete={editingAdmin ? 'new-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="admin-form-control-action"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </AdminFormField>

            <AdminFormField label="Full Name" htmlFor="sa-full-name" error={errors.full_name}>
              <input
                id="sa-full-name"
                type="text"
                value={formData.full_name}
                onChange={(e) => {
                  setFormData({ ...formData, full_name: e.target.value })
                  clearFieldError('full_name')
                }}
                className={`admin-form-control${errors.full_name ? ' admin-form-control--invalid' : ''}`}
              />
            </AdminFormField>

            <AdminFormField
              label="Role"
              htmlFor="sa-role"
              hint="Leave empty for full access to all super admin sections."
            >
              <select
                id="sa-role"
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                className="admin-form-control"
              >
                <option value="">Full access (no role)</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </AdminFormField>

            <label className="admin-form-check">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span>Active</span>
            </label>
          </form>
        </FormModal>
      </div>
    </SuperAdminPageShell>
  )
}
