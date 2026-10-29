'use client'
import { withBasePath } from '@/lib/with-base-path'
import { authenticatedFetch } from '@/lib/admin-api'

import { useState } from 'react'
import { useAdminCenter } from '@/components/admin/AdminCenterContext'
import { useAdminFetch } from '@/lib/use-admin-fetch'
import AdminPageShell from '@/components/admin/AdminPageShell'
import FormModal from '@/components/admin/FormModal'
import FormModalActions from '@/components/admin/FormModalActions'
import AdminFormField from '@/components/admin/AdminFormField'
import { useAdminFormValidation } from '@/components/admin/useAdminFormValidation'
import { Shield, Plus, Edit, Trash2 } from 'lucide-react'
import {
  filterPermissionsForCenter,
  getResourceDisplayLabel,
  getResourceGroup,
  groupPermissionsByResource,
  PERMISSION_GROUP_LABELS,
  type PermissionRow
} from '@/lib/admin-permission-catalog'
import { confirmDialog } from '@/lib/admin-ui-store'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import EmptyState from '@/components/ui/EmptyState'

const ROLE_FORM_RULES = {
  name: [{ type: 'required' as const, message: 'Role name is required.' }]
}

export default function RolesManagement({ params }: { params: { centerId: string } }) {
  const adminCenter = useAdminCenter()
  const catalogCoursesAvailable = adminCenter?.catalogCoursesAvailable ?? false
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission_ids: [] as number[]
  })
  const { errors, formError, setFormError, clearErrors, clearFieldError, validate } =
    useAdminFormValidation(formData, ROLE_FORM_RULES)

  const { data: rolesData, loading: rolesLoading, refetch: fetchRoles } = useAdminFetch<any[]>(
    `admin-roles-${params.centerId}`,
    `/api/admin/roles?centerId=${params.centerId}`,
    { auth: true },
  )
  const roles = rolesData ?? []

  const { data: permissionsData, loading: permissionsLoading, refetch: fetchPermissions } = useAdminFetch<any[]>(
    `admin-permissions-${params.centerId}`,
    `/api/admin/permissions?centerId=${params.centerId}`,
    { auth: true },
  )
  const permissions = permissionsData ?? []
  const loading = rolesLoading || permissionsLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()
    if (!validate(formData)) return

    try {      const url = withBasePath(editingRole ? `/api/admin/roles/${editingRole.id}` : '/api/admin/roles')
      const method = editingRole ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        credentials: 'include',
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          centerId: params.centerId,
          ...formData
        })
      })

      if (response.ok) {
        setIsModalOpen(false)
        resetForm()
        fetchRoles(true)
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
    try {      await authenticatedFetch(`/api/admin/roles/${id}?centerId=${params.centerId}`, { method: 'DELETE' })
      fetchRoles(true)
    } catch (error) {
      console.error('Error deleting role:', error)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', permission_ids: [] })
    setEditingRole(null)
    clearErrors()
  }

  const visiblePermissions = filterPermissionsForCenter(permissions, { catalogCoursesAvailable })
  const permissionsByResource = groupPermissionsByResource(permissions, { catalogCoursesAvailable })

  const permissionGroups = (['content', 'management'] as const).map((groupKey) => ({
    key: groupKey,
    label: PERMISSION_GROUP_LABELS[groupKey],
    resources: Object.entries(permissionsByResource).filter(
      ([resource]) => getResourceGroup(resource) === groupKey
    )
  })).filter((group) => group.resources.length > 0)

  return (
    <AdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={<span className="flex items-center gap-2"><Shield className="h-7 w-7" />Roles & Permissions</span>}
          description="Manage roles and permissions for your center"
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Roles' },
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
              Add Role
            </button>
          }
        />

        {catalogCoursesAvailable ? (
          <div className="rounded-lg border border-[var(--cm-color-border)] bg-primary-soft p-4 text-sm text-[var(--cm-color-text)]">
            Catalog courses are active. <strong>Courses</strong> permissions are hidden because course
            listings are managed centrally by Super Admin.
          </div>
        ) : null}

        <p className="text-sm text-[var(--cm-color-text-muted)]">
          Permissions are grouped by content section. Removed sections (Our Centers, Contact Page, Image
          Library, etc.) are no longer listed.
        </p>

        {loading ? (
          <LoadingSkeleton variant="cards" rows={3} />
        ) : roles.length === 0 ? (
          <EmptyState icon={Shield} title="No roles yet" message="Create a role to assign permissions." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <div key={role.id} className="admin-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{role.name}</h3>
                    {role.description && (
                      <p className="text-sm text-[var(--cm-color-text-muted)] mt-1">
                        {role.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button aria-label="Edit"
                      onClick={() => {
                        setEditingRole(role)
                        setFormData({
                          name: role.name,
                          description: role.description || '',
                          permission_ids: role.permissions?.map((p: any) => p.id) || []
                        })
                        setIsModalOpen(true)
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {!role.is_system_role && (
                      <button aria-label="Delete"
                        onClick={() => handleDelete(role.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Permissions ({(role.permissions || []).length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(role.permissions || []).slice(0, 5).map((perm: PermissionRow) => (
                      <span
                        key={perm.id}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                        title={perm.name}
                      >
                        {getResourceDisplayLabel(perm.resource)} · {perm.action}
                      </span>
                    ))}
                    {role.permissions && role.permissions.length > 5 && (
                      <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                        +{role.permissions.length - 5} more
                      </span>
                    )}
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
          description="Define a role name and assign permissions for center admins."
          formError={formError}
          size="large"
          footer={
            <FormModalActions
              formId="admin-role-form"
              onCancel={() => {
                setIsModalOpen(false)
                resetForm()
              }}
              submitLabel={editingRole ? 'Update Role' : 'Create Role'}
            />
          }
        >
          <form id="admin-role-form" onSubmit={handleSubmit} noValidate>
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
              label="Permissions"
              hint={`${visiblePermissions.length} permissions across ${Object.keys(permissionsByResource).length} sections.`}
            >
              <div className="admin-form-panel max-h-96 overflow-y-auto space-y-5">
                {permissionGroups.map((group) => (
                  <div key={group.key} className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {group.label}
                    </p>
                    {group.resources.map(([resource, perms]: [string, PermissionRow[]]) => (
                      <div key={resource} className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {getResourceDisplayLabel(resource)}
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
    </AdminPageShell>
  )
}
