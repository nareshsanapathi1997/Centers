'use client'
import { withBasePath } from '@/lib/with-base-path'
import { authenticatedFetch } from '@/lib/admin-api'

import { useState } from 'react'
import { useAdminFetch } from '@/lib/use-admin-fetch'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import AdminFormField from '@/components/admin/AdminFormField'
import { useAdminFormValidation } from '@/components/admin/useAdminFormValidation'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Mail,
  User as UserIcon,
  Shield
} from 'lucide-react'
import { confirmDialog } from '@/lib/admin-ui-store'
import AdminPageShell from '@/components/admin/AdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Input } from '@/components/forms'

export default function CenterAdminsManagement({ params }: { params: { centerId: string } }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<any>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    is_active: true,
    role_id: ''
  })

  const { data: rolesData, refetch: fetchRoles } = useAdminFetch<any[]>(
    `admin-roles-${params.centerId}`,
    `/api/admin/roles?centerId=${params.centerId}`,
    { auth: true },
  )
  const roles = rolesData ?? []

  const { data: adminsData, loading, refetch: fetchAdmins } = useAdminFetch<any[]>(
    `admin-center-admins-${params.centerId}`,
    `/api/admin/center-admins?centerId=${params.centerId}`,
    { auth: true },
  )
  const admins = adminsData ?? []

  const { errors, formError, setFormError, clearErrors, clearFieldError, validate, setErrors } =
    useAdminFormValidation(formData, {
      username: [{ type: 'required', message: 'Username is required.' }],
      email: [
        { type: 'required', message: 'Email is required.' },
        { type: 'email', message: 'Enter a valid email address.' },
      ]
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    clearErrors()

    let isValid = validate(formData)
    if (!editingAdmin && formData.password.trim().length < 6) {
      setErrors((current) => ({
        ...current,
        password: 'Password must be at least 6 characters.'
      }))
      isValid = false
    } else if (editingAdmin && formData.password && formData.password.trim().length < 6) {
      setErrors((current) => ({
        ...current,
        password: 'Password must be at least 6 characters.'
      }))
      isValid = false
    }
    if (!isValid) return

    try {
      const url = withBasePath(
        editingAdmin
          ? `/api/admin/center-admins/${editingAdmin.id}`
          : '/api/admin/center-admins'
      )
      const method = editingAdmin ? 'PATCH' : 'POST'

      const body: any = { centerId: params.centerId, ...formData }
      if (editingAdmin && !body.password) {
        delete body.password
      }
      // Don't send role_id if empty
      if (!body.role_id) {
        delete body.role_id
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
        fetchAdmins(true)
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setFormError(error.error || 'Failed to save admin.')
      }
    } catch (error) {
      console.error('Error saving admin:', error)
      setFormError('Error saving admin. Please try again.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ message: 'Are you sure you want to delete this admin?', destructive: true }))) return

    try {
      const response = await authenticatedFetch(`/api/admin/center-admins/${id}`, { method: 'DELETE' })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Admin deleted successfully!' })
        fetchAdmins(true)
        setTimeout(() => setMessage(null), 3000)
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
    // Fetch admin's current role
    let currentRoleId = ''
    try {
      const roleResponse = await authenticatedFetch(`/api/admin/admin-roles?adminId=${admin.id}&centerId=${params.centerId}`)
      if (roleResponse.ok) {
        const roleData = await roleResponse.json()
        if (roleData.length > 0) {
          currentRoleId = roleData[0].role_id.toString()
        }
      }
    } catch (error) {
      console.error('Error fetching admin role:', error)
    }

    setEditingAdmin(admin)
    setFormData({
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

  const filteredAdmins = admins.filter(
    (admin) =>
      admin.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AdminPageShell>
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
          description="Manage admin accounts for your center"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Center Admins' },
          ]}
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
          <Input
            type="search"
            placeholder="Search admins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search admins"
          />
        </div>

        <div className="admin-card overflow-hidden">
          {loading ? (
            <LoadingSkeleton variant="table" rows={6} />
          ) : filteredAdmins.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No admins found"
              message={searchTerm ? 'No admins match your search.' : 'No admins yet. Create one to get started.'}
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
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {admin.full_name || admin.username}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{admin.email}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">@{admin.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {admin.roles && admin.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {admin.roles.map((role: any) => (
                              <span
                                key={role.id}
                                className="px-2 py-1 text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full"
                              >
                                {role.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">No role</span>
                        )}
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
          onClose={() => {
            setIsModalOpen(false)
            resetForm()
          }}
          title={editingAdmin ? 'Edit Admin' : 'Add New Admin'}
          description="Create or update a center admin account."
          formError={formError}
          footer={
            <FormModalActions
              formId="center-admin-form"
              onCancel={() => {
                setIsModalOpen(false)
                resetForm()
              }}
              submitLabel={editingAdmin ? 'Update Admin' : 'Create Admin'}
            />
          }
        >
          <form id="center-admin-form" onSubmit={handleSubmit} noValidate>
            <AdminFormField label="Username" required error={errors.username}>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => {
                  clearFieldError('username')
                  setFormData({ ...formData, username: e.target.value })
                }}
                className={`admin-form-control${errors.username ? ' admin-form-control--invalid' : ''}`}
                disabled={!!editingAdmin}
              />
            </AdminFormField>

            <AdminFormField label="Email" required error={errors.email}>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  clearFieldError('email')
                  setFormData({ ...formData, email: e.target.value })
                }}
                className={`admin-form-control${errors.email ? ' admin-form-control--invalid' : ''}`}
              />
            </AdminFormField>

            <AdminFormField
              label={editingAdmin ? 'Password (leave empty to keep current)' : 'Password'}
              required={!editingAdmin}
              error={errors.password}
            >
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => {
                    clearFieldError('password')
                    setFormData({ ...formData, password: e.target.value })
                  }}
                  className={`admin-form-control pr-10${errors.password ? ' admin-form-control--invalid' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </AdminFormField>

            <AdminFormField label="Full Name">
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="admin-form-control"
              />
            </AdminFormField>

            {roles.length > 0 && (
              <AdminFormField label="Role (Optional)" hint="Assign a role to grant specific permissions.">
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="admin-form-control"
                >
                  <option value="">No Role (Default Permissions)</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name} {role.description && `- ${role.description}`}
                    </option>
                  ))}
                </select>
              </AdminFormField>
            )}

            <label className="admin-form-check">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span>Active</span>
            </label>
          </form>
        </FormModal>
      </div>
    </AdminPageShell>
  )
}
