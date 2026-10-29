'use client'
import { withBasePath } from '@/lib/with-base-path'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import AdminFormField from '@/components/admin/AdminFormField'
import { useAdminFormValidation } from '@/components/admin/useAdminFormValidation'
import type { AdminFieldRules } from '@/lib/admin-form-validation'
import { hasAdminFieldErrors, validateAdminFields } from '@/lib/admin-form-validation'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Building2,
  Mail,
  User as UserIcon
} from 'lucide-react'
import { confirmDialog } from '@/lib/admin-ui-store'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/forms'

const CENTER_ADMIN_FORM_RULES: AdminFieldRules = {
  center_id: [{ type: 'required', message: 'Select a center.' }],
  username: [{ type: 'required' }, { type: 'minLength', value: 3, message: 'Username must be at least 3 characters.' }],
  email: [{ type: 'required' }, { type: 'email' }],
  full_name: [{ type: 'minLength', value: 2, message: 'Full name must be at least 2 characters.' }]
}

export default function CenterAdminsManagement() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [admins, setAdmins] = useState<any[]>([])
  const [centers, setCenters] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCenter, setSelectedCenter] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<any>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [roles, setRoles] = useState<any[]>([])
  const [formData, setFormData] = useState({
    center_id: '',
    username: '',
    email: '',
    password: '',
    full_name: '',
    is_active: true,
    role_id: ''
  })
  const [saving, setSaving] = useState(false)
  const { errors, formError, setFormError, clearErrors, clearFieldError, setErrors } =
    useAdminFormValidation(formData, CENTER_ADMIN_FORM_RULES)

  useEffect(() => {
    fetchCenters()
    fetchAdmins()
    fetchRoles()
  }, [])

  const fetchRoles = async (centerId?: string) => {
    if (!centerId) return
    try {
      const response = await superAdminFetch(`/api/admin/roles?centerId=${centerId}`)
      if (response.ok) {
        const data = await response.json()
        setRoles(data)
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }

  useEffect(() => {
    if (formData.center_id) {
      fetchRoles(formData.center_id)
    }
  }, [formData.center_id])

  const fetchCenters = async () => {
    try {
      const response = await superAdminFetch('/api/super-admin/centers')
      if (response.ok) {
        const data = await response.json()
        setCenters(data)
      }
    } catch (error) {
      console.error('Error fetching centers:', error)
    }
  }

  const fetchAdmins = async () => {
    try {
      setLoading(true)
      const url = withBasePath(
        selectedCenter
          ? `/api/super-admin/center-admins?centerId=${selectedCenter}`
          : '/api/super-admin/center-admins'
      )
      const response = await fetch(url, {
        credentials: 'include'
              })
      if (response.ok) {
        const data = await response.json()
        setAdmins(data)
      }
    } catch (error) {
      console.error('Error fetching admins:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [selectedCenter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setFormError('')
    setSaving(true)

    const rules: AdminFieldRules = editingAdmin
      ? {
          email: CENTER_ADMIN_FORM_RULES.email,
          full_name: CENTER_ADMIN_FORM_RULES.full_name
        }
      : CENTER_ADMIN_FORM_RULES

    const nextErrors = validateAdminFields(formData, rules)
    setErrors(nextErrors)
    if (hasAdminFieldErrors(nextErrors)) {
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
      const url = withBasePath(
        editingAdmin
          ? `/api/super-admin/center-admins/${editingAdmin.id}`
          : '/api/super-admin/center-admins'
      )
      const method = editingAdmin ? 'PATCH' : 'POST'

      const body: any = { ...formData }
      if (editingAdmin && !body.password) {
        delete body.password
      }

      const response = await fetch(url, {
        credentials: 'include',
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        setMessage({
          type: 'success',
          text: editingAdmin ? 'Admin updated successfully!' : 'Admin created successfully!'
        })
        setIsModalOpen(false)
        resetForm()
        fetchAdmins()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to save admin' })
      }
    } catch (error) {
      console.error('Error saving admin:', error)
      setMessage({ type: 'error', text: 'Error saving admin' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ message: 'Are you sure you want to delete this admin?', destructive: true }))) return

    try {
      const response = await superAdminFetch(`/api/super-admin/center-admins/${id}`, { method: 'DELETE' })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Admin deleted successfully!' })
        fetchAdmins()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to delete admin' })
      }
    } catch (error) {
      console.error('Error deleting admin:', error)
      setMessage({ type: 'error', text: 'Error deleting admin' })
    }
  }

  const handleEdit = async (admin: any) => {
    setEditingAdmin(admin)
    const centerId = admin.center_id.toString()
    
    // Fetch roles for this center
    await fetchRoles(centerId)
    
    // Fetch admin's current role
    let currentRoleId = ''
    try {
      const roleResponse = await superAdminFetch(`/api/admin/admin-roles?adminId=${admin.id}&centerId=${centerId}`)
      if (roleResponse.ok) {
        const roleData = await roleResponse.json()
        if (roleData.length > 0) {
          currentRoleId = roleData[0].role_id.toString()
        }
      }
    } catch (error) {
      console.error('Error fetching admin role:', error)
    }
    
    setFormData({
      center_id: centerId,
      username: admin.username || '',
      email: admin.email || '',
      password: '',
      full_name: admin.full_name || '',
      is_active: admin.is_active !== undefined ? admin.is_active : true,
      role_id: currentRoleId
    })
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setFormData({
      center_id: '',
      username: '',
      email: '',
      password: '',
      full_name: '',
      is_active: true,
      role_id: ''
    })
    setEditingAdmin(null)
    setShowPassword(false)
    clearErrors()
  }

  const closeModal = () => {
    setIsModalOpen(false)
    resetForm()
  }

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.center_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <SuperAdminPageShell>
      <div className="space-y-6">
        {message && (
          <div
            className={`rounded-lg p-4 ${
              message.type === 'success'
                ? 'border border-success bg-success-soft text-success'
                : 'border border-danger bg-danger-soft text-danger'
            }`}
          >
            {message.text}
          </div>
        )}

        <PageHeader
          title={<span className="flex items-center gap-2"><Users className="h-7 w-7" />Center Admins</span>}
          description="Manage admin accounts for all centers"
          breadcrumbs={[{ label: 'Super Admin', href: '/super-admin' }, { label: 'Center Admins' }]}
          actions={
            <button
              type="button"
              onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}
              className="admin-btn admin-btn--primary admin-btn--sm"
            >
              <Plus className="h-5 w-5" />
              Add Admin
            </button>
          }
        />

        <div className="admin-card p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Input
                type="search"
                placeholder="Search admins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search center admins"
              />
            </div>
            <div className="sm:w-64">
              <Select
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
                aria-label="Filter by center"
              >
                <option value="">All Centers</option>
                {centers.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        <div className="admin-card overflow-hidden">
          {loading ? (
            <LoadingSkeleton variant="table" rows={6} />
          ) : filteredAdmins.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No admins found"
              message={
                searchTerm || selectedCenter
                  ? 'No admins match your filters.'
                  : 'No admins yet. Create one to get started.'
              }
              compact
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Center
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
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {admin.full_name || admin.username}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {admin.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          {admin.center_name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            admin.is_active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}
                        >
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button aria-label="Edit"
                            onClick={() => handleEdit(admin)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button aria-label="Delete"
                            onClick={() => handleDelete(admin.id)}
                            className="admin-btn admin-btn--icon admin-btn--icon-danger"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <FormModal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={editingAdmin ? 'Edit Center Admin' : 'Add Center Admin'}
          size="large"
          formError={formError}
          footer={
            <FormModalActions
              formId="super-admin-center-admin-form"
              onCancel={closeModal}
              submitLabel={editingAdmin ? 'Update Admin' : 'Create Admin'}
              isSubmitting={saving}
            />
          }
        >
          <form id="super-admin-center-admin-form" onSubmit={handleSubmit} noValidate>
            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Center" htmlFor="ca-center" required error={errors.center_id}>
                <select
                  id="ca-center"
                  value={formData.center_id}
                  onChange={(e) => {
                    setFormData({ ...formData, center_id: e.target.value, role_id: '' })
                    clearFieldError('center_id')
                  }}
                  className={`admin-form-control${errors.center_id ? ' admin-form-control--invalid' : ''}`}
                  disabled={!!editingAdmin}
                >
                  <option value="">Select center</option>
                  {centers.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </AdminFormField>

              <AdminFormField label="Username" htmlFor="ca-username" required error={errors.username}>
                <input
                  id="ca-username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    setFormData({ ...formData, username: e.target.value })
                    clearFieldError('username')
                  }}
                  className={`admin-form-control${errors.username ? ' admin-form-control--invalid' : ''}`}
                  disabled={!!editingAdmin}
                  autoComplete="username"
                />
              </AdminFormField>
            </div>

            <div className="admin-form-row admin-form-row--2">
              <AdminFormField label="Email" htmlFor="ca-email" required error={errors.email}>
                <input
                  id="ca-email"
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
                label={editingAdmin ? 'Password (leave empty to keep)' : 'Password'}
                htmlFor="ca-password"
                required={!editingAdmin}
                hint="Minimum 6 characters."
              >
                <div className="admin-form-control-wrap">
                  <input
                    id="ca-password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="admin-form-control admin-form-control--with-action"
                    autoComplete="new-password"
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
            </div>

            <AdminFormField label="Full Name" htmlFor="ca-full-name" error={errors.full_name}>
              <input
                id="ca-full-name"
                type="text"
                value={formData.full_name}
                onChange={(e) => {
                  setFormData({ ...formData, full_name: e.target.value })
                  clearFieldError('full_name')
                }}
                className={`admin-form-control${errors.full_name ? ' admin-form-control--invalid' : ''}`}
              />
            </AdminFormField>

            {formData.center_id && roles.length > 0 ? (
              <AdminFormField
                label="Role"
                htmlFor="ca-role"
                hint="Optional — assign permissions for this center."
              >
                <select
                  id="ca-role"
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="admin-form-control"
                >
                  <option value="">No role (default permissions)</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                      {role.description ? ` — ${role.description}` : ''}
                    </option>
                  ))}
                </select>
              </AdminFormField>
            ) : null}

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
