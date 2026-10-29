export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'approve' | 'export'

export type AdminPermissionResourceDef = {
  resource: string
  label: string
  group: 'content' | 'management'
  actions: PermissionAction[]
  routePrefixes?: string[]
  hideWhenCatalogCourses?: boolean
}

/** Resources removed from center admin — hidden and excluded from new seeds */
export const DEPRECATED_PERMISSION_RESOURCES = [
  'centers',
  'contact_page',
  'contact-page',
  'student_stories',
  'image_library',
  'cta_sliders',
  'alerts',
] as const

export const ADMIN_PERMISSION_RESOURCES: AdminPermissionResourceDef[] = [
  // Content (matches center admin sidebar)
  {
    resource: 'sections',
    label: 'Sections',
    group: 'content',
    actions: ['read', 'update'],
    routePrefixes: ['/sections'],
  },
  {
    resource: 'hero',
    label: 'Home Page Slider',
    group: 'content',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/hero'],
  },
  {
    resource: 'news',
    label: 'News & Notifications',
    group: 'content',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/news'],
  },
  {
    resource: 'courses',
    label: 'Courses',
    group: 'content',
    actions: ['read', 'create', 'update', 'delete'],
    hideWhenCatalogCourses: true,
    routePrefixes: ['/courses'],
  },
  {
    resource: 'results',
    label: 'Results',
    group: 'content',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/results'],
  },
  {
    resource: 'testimonials',
    label: 'Testimonials',
    group: 'content',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/testimonials'],
  },
  {
    resource: 'leadership',
    label: 'Directors',
    group: 'content',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/leadership'],
  },
  {
    resource: 'senior_faculty',
    label: 'Senior Faculty',
    group: 'content',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/senior-faculty'],
  },
  {
    resource: 'gallery',
    label: 'Gallery',
    group: 'content',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/gallery'],
  },
  {
    resource: 'blog',
    label: 'Blog',
    group: 'content',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/blog', '/blog-comments'],
  },
  {
    resource: 'faq',
    label: 'People Also Ask',
    group: 'content',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/faq'],
  },
  {
    resource: 'vacancies',
    label: 'Vacancies',
    group: 'content',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/vacancies'],
  },
  {
    resource: 'about',
    label: 'Get To Know Us',
    group: 'content',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/about'],
  },
  {
    resource: 'custom_sections',
    label: 'Custom Sections',
    group: 'content',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/custom-sections'],
  },
  // Management
  {
    resource: 'enquiries',
    label: 'Enquiries',
    group: 'management',
    actions: ['read', 'update', 'delete'],
    routePrefixes: ['/enquiries', '/notifications', '/dashboard'],
  },
  {
    resource: 'settings',
    label: 'Center Settings',
    group: 'management',
    actions: ['read', 'update'],
    routePrefixes: ['/settings'],
  },
  {
    resource: 'center_admins',
    label: 'Center Admins',
    group: 'management',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/center-admins'],
  },
  {
    resource: 'roles',
    label: 'Roles & Permissions',
    group: 'management',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/roles'],
  },
  {
    resource: 'course_fees',
    label: 'Course Pricing',
    group: 'management',
    actions: ['read', 'create', 'update'],
    routePrefixes: ['/course-fees'],
  },
  {
    resource: 'student_payments',
    label: 'Student Payments',
    group: 'management',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/student-payments', '/enrollment'],
  },
  {
    resource: 'students',
    label: 'Student Portal Accounts',
    group: 'management',
    actions: ['read', 'create', 'update'],
    routePrefixes: ['/students'],
  },
  {
    resource: 'course_materials',
    label: 'Study Materials',
    group: 'management',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/course-materials'],
  },
  {
    resource: 'assessments',
    label: 'Quizzes & Exams',
    group: 'management',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/assessments'],
  },
  {
    resource: 'employees',
    label: 'Employees',
    group: 'management',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/employees'],
  },
  {
    resource: 'expenses',
    label: 'Expenses',
    group: 'management',
    actions: ['read', 'create', 'update', 'delete', 'approve'],
    routePrefixes: ['/expenses'],
  },
  {
    resource: 'reports',
    label: 'Reports',
    group: 'management',
    actions: ['read', 'export'],
    routePrefixes: ['/reports'],
  },
  {
    resource: 'batches',
    label: 'Batches',
    group: 'management',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/batches'],
  },
  {
    resource: 'attendance',
    label: 'Attendance',
    group: 'management',
    actions: ['read', 'create', 'update', 'delete'],
    routePrefixes: ['/attendance'],
  },
]

const RESOURCE_LABELS = ADMIN_PERMISSION_RESOURCES.reduce<Record<string, string>>((acc, item) => {
  acc[item.resource] = item.label
  return acc
}, {})

export function getResourceDisplayLabel(resource: string): string {
  return RESOURCE_LABELS[resource] || resource.replace(/_/g, ' ')
}

export function isDeprecatedPermissionResource(resource: string): boolean {
  return (DEPRECATED_PERMISSION_RESOURCES as readonly string[]).includes(resource)
}

export function shouldShowPermissionResource(
  resource: string,
  options: { catalogCoursesAvailable?: boolean } = {}
): boolean {
  if (isDeprecatedPermissionResource(resource)) return false

  const def = ADMIN_PERMISSION_RESOURCES.find((item) => item.resource === resource)
  if (!def) return false

  if (options.catalogCoursesAvailable && def.hideWhenCatalogCourses) {
    return false
  }

  return true
}

export type PermissionRow = {
  id: number
  name: string
  resource: string
  action: string
  description?: string | null
}

export function filterPermissionsForCenter(
  permissions: PermissionRow[],
  options: { catalogCoursesAvailable?: boolean } = {}
): PermissionRow[] {
  return permissions.filter((perm) => shouldShowPermissionResource(perm.resource, options))
}

export function groupPermissionsByResource(
  permissions: PermissionRow[],
  options: { catalogCoursesAvailable?: boolean } = {}
): Record<string, PermissionRow[]> {
  const grouped: Record<string, PermissionRow[]> = {}

  for (const def of ADMIN_PERMISSION_RESOURCES) {
    if (!shouldShowPermissionResource(def.resource, options)) continue
    grouped[def.resource] = []
  }

  for (const perm of filterPermissionsForCenter(permissions, options)) {
    if (!grouped[perm.resource]) grouped[perm.resource] = []
    grouped[perm.resource].push(perm)
  }

  for (const resource of Object.keys(grouped)) {
    grouped[resource].sort((a, b) => a.action.localeCompare(b.action))
  }

  return grouped
}

export function buildPermissionSeedRecords() {
  const records: Array<{
    name: string
    resource: string
    action: PermissionAction
    description: string
  }> = []

  for (const def of ADMIN_PERMISSION_RESOURCES) {
    for (const action of def.actions) {
      records.push({
        name: `${def.resource}.${action}`,
        resource: def.resource,
        action,
        description: `${action} ${def.label}`,
      })
    }
  }

  return records
}

export const PERMISSION_GROUP_LABELS: Record<AdminPermissionResourceDef['group'], string> = {
  content: 'Content Sections',
  management: 'Management',
}

export function getResourceGroup(resource: string): AdminPermissionResourceDef['group'] | 'other' {
  return ADMIN_PERMISSION_RESOURCES.find((item) => item.resource === resource)?.group || 'other'
}

/** Strip `/admin/:centerId` prefix from admin panel paths. */
export function normalizeAdminPanelPath(pathname: string | null): string | null {
  if (!pathname) return null
  const match = pathname.match(/^\/admin\/[^/]+(\/.*)?$/)
  if (!match) return pathname
  return match[1] || '/dashboard'
}

export function getAdminResourceForPath(pathname: string | null): string | null {
  const path = normalizeAdminPanelPath(pathname)
  if (!path) return null
  if (path === '/profile' || path === '/activity-logs') return null

  let bestMatch: AdminPermissionResourceDef | null = null
  let bestLength = -1

  for (const def of ADMIN_PERMISSION_RESOURCES) {
    for (const prefix of def.routePrefixes || []) {
      const exact = path === prefix
      const nested = path.startsWith(`${prefix}/`)
      if ((exact || nested) && prefix.length > bestLength) {
        bestMatch = def
        bestLength = prefix.length
      }
    }
  }

  return bestMatch?.resource || null
}

export function getMenuPermissionResource(href: string): string | null {
  return getAdminResourceForPath(href)
}

export function canShowAdminMenuItem(
  access: { fullAccess: boolean; grants: Array<{ resource: string; action: string }> } | null,
  href: string
): boolean {
  const resource = getMenuPermissionResource(href)
  if (!resource) return true
  if (!access || access.fullAccess) return true
  return access.grants.some((grant) => grant.resource === resource && grant.action === 'read')
}
