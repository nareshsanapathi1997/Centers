'use client'
import { withBasePath } from '@/lib/with-base-path'
import { superAdminFetch } from '@/lib/super-admin-api'

import { useEffect, useState } from 'react'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import AdminFormField from '@/components/admin/AdminFormField'
import { useAdminFormValidation } from '@/components/admin/useAdminFormValidation'
import {
  getSuperAdminResourceGroup,
  getSuperAdminResourceLabel,
  groupSuperAdminPermissionsByResource,
  SUPER_ADMIN_PERMISSION_GROUP_LABELS,
  type SuperAdminPermissionRow
} from '@/lib/super-admin-permission-catalog'
import { Shield, Plus, Edit, Trash2 } from 'lucide-react'
import { toast, confirmDialog } from '@/lib/admin-ui-store'
import SuperAdminPageShell from '@/components/admin/SuperAdminPageShell'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'

const ROLE_FORM_RULES = {
  name: [{ type: 'required' as const, message: 'Role name is required.' }]
}

export default function SuperAdminRolesPage() {
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<any[]>([])
  const [permissions, setPermissions] = useState<SuperAdminPermissionRow[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission_ids: [] as number[]
  })
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, ROLE_FORM_RULES)

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [])

  const fetchRoles = async () => {
    try {      const response = await superAdminFetch('/api/super-admin/roles')
      if (response.ok) setRoles(await response.json())
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {      const response = await superAdminFetch('/api/super-admin/permissions')
      if (response.ok) setPermissions(await response.json())
    } catch (error) {
      console.error('Error fetching permissions:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!validate(formData)) return

    try {      const url = withBasePath(editingRole ? `/api/super-admin/roles/${editingRole.id}` : '/api/super-admin/roles')
      const response = await fetch(url, {
        credentials: 'include',
        method: editingRole ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setIsModalOpen(false)
        resetForm()
        fetchRoles()
      } else {
        const error = await response.json()
        setFormError(error.error || 'Failed to save role.')
      }
    } catch (error) {
      console.error('Error saving role:', error)
      setFormError('Failed to save role. Please try again.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!(await confirmDialog({ message: 'Are you sure you want to delete this role?', destructive: true }))) return
    try {      const response = await superAdminFetch(`/api/super-admin/roles/${id}`, { method: 'DELETE' })
      if (response.ok) fetchRoles()
      else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete role')
      }
    } catch (error) {
      console.error('Error deleting role:', error)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', permission_ids: [] })
    setEditingRole(null)
    clearErrors()
  }

  const permissionsByResource = groupSuperAdminPermissionsByResource(permissions)
  const permissionGroups = (Object.keys(SUPER_ADMIN_PERMISSION_GROUP_LABELS) as Array<
    keyof typeof SUPER_ADMIN_PERMISSION_GROUP_LABELS
  >)
    .map((groupKey) => ({
      key: groupKey,
      label: SUPER_ADMIN_PERMISSION_GROUP_LABELS[groupKey],
      resources: Object.entries(permissionsByResource).filter(
        ([resource]) => getSuperAdminResourceGroup(resource) === groupKey
      )
    }))
    .filter((group) => group.resources.length > 0)

  return (
    <SuperAdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={<span className="flex items-center gap-2"><Shield className="h-7 w-7" />Super Admin Roles & Permissions</span>}
          description="Control which super admin sections each user can access"
          breadcrumbs={[{ label: 'Super Admin', href: '/super-admin' }, { label: 'Roles' }]}
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
              Add Role
            </button>
          }
        />

        {loading ? (
          <LoadingSkeleton variant="cards" rows={3} />
        ) : roles.length === 0 ? (
          <EmptyState icon={Shield} title="No roles yet" message="Create a role to assign permissions." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <div
                key={role.id}
                className="admin-card p-6"
              >
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{role.name}</h3>
                    {role.description ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{role.description}</p>
                    ) : null}
                    {role.is_system_role ? (
                      <span className="inline-flex mt-2 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        System role
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button aria-label="Edit"
                      onClick={() => {
                        setEditingRole(role)
                        setFormData({
                          name: role.name,
                          description: role.description || '',
                          permission_ids: role.permissions?.map((p: SuperAdminPermissionRow) => p.id) || []
                        })
                        setIsModalOpen(true)
                      }}
                      className="admin-btn admin-btn--icon admin-btn--icon-edit"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {!role.is_system_role ? (
                      <button aria-label="Delete"
                        onClick={() => handleDelete(role.id)}
                        className="admin-btn admin-btn--icon admin-btn--icon-danger"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Permissions ({(role.permissions || []).length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(role.permissions || []).slice(0, 5).map((perm: SuperAdminPermissionRow) => (
                      <span
                        key={perm.id}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                      >
                        {getSuperAdminResourceLabel(perm.resource)} · {perm.action}
                      </span>
                    ))}
                    {(role.permissions || []).length > 5 ? (
                      <span className="px-2 py-1 text-xs text-gray-500">+{role.permissions.length - 5} more</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <FormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            resetForm()
          }}
          title={editingRole ? 'Edit Role' : 'Add Role'}
          description="Assign section access for super admin users."
          formError={formError}
          size="large"
          footer={
            <FormModalActions
              formId="super-admin-role-form"
              onCancel={() => {
                setIsModalOpen(false)
                resetForm()
              }}
              submitLabel={editingRole ? 'Update Role' : 'Create Role'}
            />
          }
        >
          <form id="super-admin-role-form" onSubmit={handleSubmit} noValidate>
            <AdminFormField label="Role Name" required error={errors.name}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  clearFieldError('name')
                  setFormData({ ...formData, name: e.target.value })
                }}
                className={`admin-form-control${errors.name ? ' admin-form-control--invalid' : ''}`}
              />
            </AdminFormField>

            <AdminFormField label="Description">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="admin-form-control"
                rows={3}
              />
            </AdminFormField>

            <AdminFormField
              label="Section Access"
              hint={`${permissions.length} permissions across super admin sections.`}
            >
              <div className="admin-form-panel max-h-96 overflow-y-auto space-y-5">
                {permissionGroups.map((group) => (
                  <div key={group.key} className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {group.label}
                    </p>
                    {group.resources.map(([resource, perms]: [string, SuperAdminPermissionRow[]]) => (
                      <div key={resource} className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {getSuperAdminResourceLabel(resource)}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {perms.map((perm) => (
                            <label
                              key={perm.id}
                              className="admin-form-check p-2 hover:bg-white/70 dark:hover:bg-gray-700/50 rounded-md"
                            >
                              <input
                                type="checkbox"
                                checked={formData.permission_ids.includes(perm.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      permission_ids: [...formData.permission_ids, perm.id]
                                    })
                                  } else {
                                    setFormData({
                                      ...formData,
                                      permission_ids: formData.permission_ids.filter((id) => id !== perm.id)
                                    })
                                  }
                                }}
                              />
                              <span className="capitalize">{perm.action}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </AdminFormField>
          </form>
        </FormModal>
      </div>
    </SuperAdminPageShell>
  )
}
