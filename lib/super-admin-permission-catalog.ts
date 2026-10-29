export type SuperAdminPermissionAction = 'read' | 'create' | 'update' | 'delete' | 'approve' | 'export'

export type SuperAdminPermissionResourceDef = {
  resource: string
  label: string
  group: 'main' | 'centers' | 'insights' | 'users' | 'communications' | 'marketing' | 'settings'
  actions: SuperAdminPermissionAction[]
  routePrefixes?: string[]
}

export const SUPER_ADMIN_PERMISSION_RESOURCES: SuperAdminPermissionResourceDef[] = [
  { resource: 'dashboard', label: 'Dashboard', group: 'main', actions: ['read'], routePrefixes: ['/super-admin/dashboard'] },
  { resource: 'centers', label: 'Centers', group: 'centers', actions: ['read', 'create', 'update', 'delete'], routePrefixes: ['/super-admin/centers'] },
  { resource: 'courses', label: 'Courses', group: 'centers', actions: ['read', 'create', 'update', 'delete'], routePrefixes: ['/super-admin/courses'] },
  { resource: 'course_masters', label: 'Course Masters', group: 'centers', actions: ['read', 'create', 'update', 'delete'], routePrefixes: ['/super-admin/course-masters'] },
  { resource: 'nearby_centers', label: 'Nearby Centers', group: 'centers', actions: ['read', 'create', 'update', 'delete'], routePrefixes: ['/super-admin/nearby-centers'] },
  { resource: 'course_fees', label: 'Course Fee Management', group: 'centers', actions: ['read', 'create', 'update', 'delete'], routePrefixes: ['/super-admin/course-fees'] },
  { resource: 'employees', label: 'Employees', group: 'users', actions: ['read', 'create', 'update', 'delete'], routePrefixes: ['/super-admin/employees'] },
  { resource: 'expenses', label: 'Expenses', group: 'users', actions: ['read', 'create', 'update', 'delete', 'approve'], routePrefixes: ['/super-admin/expenses'] },
  { resource: 'batches', label: 'Batches', group: 'users', actions: ['read', 'create', 'update', 'delete'], routePrefixes: ['/super-admin/batches'] },
  { resource: 'attendance', label: 'Attendance', group: 'users', actions: ['read', 'create', 'update', 'delete'], routePrefixes: ['/super-admin/attendance'] },
  { resource: 'analytics', label: 'Analytics', group: 'insights', actions: ['read'], routePrefixes: ['/super-admin/analytics'] },
  { resource: 'reports', label: 'Reports', group: 'insights', actions: ['read', 'export'], routePrefixes: ['/super-admin/reports'] },
  { resource: 'activity_logs', label: 'Activity Logs', group: 'insights', actions: ['read'], routePrefixes: ['/super-admin/activity-logs'] },
  { resource: 'super_admins', label: 'Super Admins', group: 'users', actions: ['read', 'create', 'update', 'delete'], routePrefixes: ['/super-admin/admins'] },
  { resource: 'center_admins', label: 'Center Admins', group: 'users', actions: ['read', 'create', 'update', 'delete'], routePrefixes: ['/super-admin/center-admins'] },
  { resource: 'super_admin_roles', label: 'Roles & Permissions', group: 'users', actions: ['read', 'create', 'update', 'delete'], routePrefixes: ['/super-admin/roles'] },
  { resource: 'contact_submissions', label: 'Contact Submissions', group: 'communications', actions: ['read', 'update', 'delete'], routePrefixes: ['/super-admin/contact-submissions'] },
  { resource: 'notifications', label: 'Notifications', group: 'communications', actions: ['read', 'update'], routePrefixes: ['/super-admin/notifications'] },
  { resource: 'send_messages', label: 'Send Messages', group: 'communications', actions: ['read', 'create'], routePrefixes: ['/super-admin/send-messages'] },
  { resource: 'email_templates', label: 'Email Templates', group: 'communications', actions: ['read', 'create', 'update', 'delete'], routePrefixes: ['/super-admin/email-templates'] },
  { resource: 'approvals', label: 'Content Approvals', group: 'communications', actions: ['read', 'update'], routePrefixes: ['/super-admin/approvals'] },
  { resource: 'seo', label: 'SEO Management', group: 'marketing', actions: ['read', 'create', 'update', 'delete'], routePrefixes: ['/super-admin/seo'] },
  { resource: 'website_home', label: 'Website Home', group: 'marketing', actions: ['read', 'create', 'update', 'delete'], routePrefixes: ['/super-admin/website-home'] },
  { resource: 'settings_hero', label: 'Settings · Hero Section', group: 'settings', actions: ['read', 'update'], routePrefixes: ['/super-admin/settings'] },
  { resource: 'settings_logo', label: 'Settings · Logo & Favicon', group: 'settings', actions: ['read', 'update'], routePrefixes: ['/super-admin/settings/logo-favicon'] },
  { resource: 'settings_theme', label: 'Settings · Theme', group: 'settings', actions: ['read', 'update'], routePrefixes: ['/super-admin/settings/theme'] },
  { resource: 'settings_navigation', label: 'Settings · Header Navigation', group: 'settings', actions: ['read', 'update'], routePrefixes: ['/super-admin/settings/navigation'] },
  { resource: 'settings_menu_items', label: 'Settings · Menu Items', group: 'settings', actions: ['read', 'update'], routePrefixes: ['/super-admin/settings/menu-items'] },
  { resource: 'settings_mobile_app', label: 'Settings · Mobile App', group: 'settings', actions: ['read', 'update'], routePrefixes: ['/super-admin/settings/mobile-app'] },
  { resource: 'settings_footer', label: 'Settings · Footer', group: 'settings', actions: ['read', 'update'], routePrefixes: ['/super-admin/settings/footer'] },
  { resource: 'settings_approvals', label: 'Settings · Content Approvals', group: 'settings', actions: ['read', 'update'], routePrefixes: ['/super-admin/settings/approvals'] },
  { resource: 'settings_global', label: 'Settings · Global Settings', group: 'settings', actions: ['read', 'update'], routePrefixes: ['/super-admin/settings/global'] },
]

export const SUPER_ADMIN_PERMISSION_GROUP_LABELS: Record<
  SuperAdminPermissionResourceDef['group'],
  string
> = {
  main: 'Main',
  centers: 'Centers',
  insights: 'Insights',
  users: 'Users',
  communications: 'Communications',
  marketing: 'Marketing',
  settings: 'Settings',
}

const RESOURCE_LABELS = SUPER_ADMIN_PERMISSION_RESOURCES.reduce<Record<string, string>>((acc, item) => {
  acc[item.resource] = item.label
  return acc
}, {})

export function getSuperAdminResourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] || resource.replace(/_/g, ' ')
}

export function getSuperAdminResourceGroup(resource: string): SuperAdminPermissionResourceDef['group'] | 'other' {
  return SUPER_ADMIN_PERMISSION_RESOURCES.find((item) => item.resource === resource)?.group || 'other'
}

export type SuperAdminPermissionRow = {
  id: number
  name: string
  resource: string
  action: string
  description?: string | null
}

export function groupSuperAdminPermissionsByResource(
  permissions: SuperAdminPermissionRow[]
): Record<string, SuperAdminPermissionRow[]> {
  const grouped: Record<string, SuperAdminPermissionRow[]> = {}

  for (const def of SUPER_ADMIN_PERMISSION_RESOURCES) {
    grouped[def.resource] = []
  }

  for (const perm of permissions) {
    if (!grouped[perm.resource]) grouped[perm.resource] = []
    grouped[perm.resource].push(perm)
  }

  for (const resource of Object.keys(grouped)) {
    grouped[resource].sort((a, b) => a.action.localeCompare(b.action))
  }

  return grouped
}

export function buildSuperAdminPermissionSeedRecords() {
  const records: Array<{
    name: string
    resource: string
    action: SuperAdminPermissionAction
    description: string
  }> = []

  for (const def of SUPER_ADMIN_PERMISSION_RESOURCES) {
    for (const action of def.actions) {
      records.push({
        name: `sa.${def.resource}.${action}`,
        resource: def.resource,
        action,
        description: `${action} ${def.label}`,
      })
    }
  }

  return records
}

export function getSuperAdminResourceForPath(pathname: string | null): string | null {
  if (!pathname) return null
  if (pathname === '/super-admin/profile') return null

  let bestMatch: SuperAdminPermissionResourceDef | null = null
  let bestLength = -1

  for (const def of SUPER_ADMIN_PERMISSION_RESOURCES) {
    for (const prefix of def.routePrefixes || []) {
      const exact = pathname === prefix
      const nested = pathname.startsWith(`${prefix}/`)
      if ((exact || nested) && prefix.length > bestLength) {
        bestMatch = def
        bestLength = prefix.length
      }
    }
  }

  return bestMatch?.resource || null
}

export function getMenuPermissionResource(href: string): string | null {
  if (href === '/super-admin/profile') return null
  if (href === '/super-admin/settings') return 'settings_hero'

  const def = SUPER_ADMIN_PERMISSION_RESOURCES.find((item) =>
    item.routePrefixes?.some((prefix) => prefix === href || href.startsWith(`${prefix}/`))
  )

  return def?.resource || null
}
