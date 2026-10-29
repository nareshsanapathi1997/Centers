export type AdminPageMeta = {
  title: string
  backUrl?: string
}

const ADMIN_PAGE_META: Record<string, Omit<AdminPageMeta, 'title'> & { title: string }> = {
  dashboard: { title: 'Dashboard' },
  enquiries: { title: 'Enquiries' },
  sections: { title: 'Section Configuration', backUrl: 'dashboard' },
  hero: { title: 'Hero Slider Management', backUrl: 'dashboard' },
  news: { title: 'News & Notifications', backUrl: 'dashboard' },
  courses: { title: 'Courses Management', backUrl: 'dashboard' },
  results: { title: 'Results Management', backUrl: 'dashboard' },
  testimonials: { title: 'Testimonials Management', backUrl: 'dashboard' },
  leadership: { title: 'Center Directors', backUrl: 'dashboard' },
  'senior-faculty': { title: 'Senior Faculty' },
  gallery: { title: 'Photo & Video Gallery', backUrl: 'dashboard' },
  blog: { title: 'Blog Module', backUrl: 'dashboard' },
  'blog-comments': { title: 'Blog Comments', backUrl: 'blog' },
  'custom-sections': { title: 'Custom Section Builder', backUrl: 'dashboard' },
  'cta-sliders': { title: 'Moving Heading / CTA Slider', backUrl: 'dashboard' },
  faq: { title: 'People Also Ask (FAQ)' },
  about: { title: 'Get To Know Us' },
  vacancies: { title: 'Vacancies' },
  settings: { title: 'Center Settings', backUrl: 'dashboard' },
  profile: { title: 'My Profile' },
  roles: { title: 'Roles & Permissions' },
  'center-admins': { title: 'Center Admins' },
  'image-library': { title: 'Image Library' },
  'activity-logs': { title: 'Activity Logs' },
  notifications: { title: 'Notifications', backUrl: 'dashboard' },
  'student-stories': { title: 'Student Stories', backUrl: 'dashboard' },
  'course-fees': { title: 'Course Pricing', backUrl: 'dashboard' },
  'student-payments': { title: 'Student Payments', backUrl: 'dashboard' },
  enrollment: { title: 'Enrollment & Offers', backUrl: 'dashboard' },
  students: { title: 'Student Portal Accounts', backUrl: 'dashboard' },
  'course-materials': { title: 'Course Study Materials', backUrl: 'dashboard' },
  assessments: { title: 'Quizzes & Exams', backUrl: 'dashboard' },
  employees: { title: 'Employees', backUrl: 'dashboard' },
  expenses: { title: 'Expenses', backUrl: 'dashboard' },
  reports: { title: 'Reports', backUrl: 'dashboard' },
}

export function getAdminPageMeta(pathname: string | null, centerId: string): AdminPageMeta {
  const segments = (pathname || '').split('/').filter(Boolean)
  const centerIndex = segments.indexOf(centerId)
  const section = centerIndex >= 0 ? segments[centerIndex + 1] || 'dashboard' : 'dashboard'
  const meta = ADMIN_PAGE_META[section] || {
    title: section.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }

  const backUrl =
    meta.backUrl === 'dashboard'
      ? `/admin/${centerId}/dashboard`
      : meta.backUrl
        ? `/admin/${centerId}/${meta.backUrl}`
        : undefined

  return { title: meta.title, backUrl }
}

const SUPER_ADMIN_PAGE_META: Record<string, string> = {
  dashboard: 'Dashboard',
  centers: 'Centers',
  courses: 'Courses',
  'course-masters': 'Course Masters',
  'nearby-centers': 'Nearby Centers',
  analytics: 'Analytics',
  'activity-logs': 'Activity Logs',
  admins: 'Super Admins',
  'center-admins': 'Center Admins',
  roles: 'Roles & Permissions',
  'contact-submissions': 'Contact Submissions',
  notifications: 'Notifications',
  'send-messages': 'Send Messages',
  'email-templates': 'Email Templates',
  approvals: 'Approvals',
  seo: 'SEO Management',
  settings: 'Settings',
  profile: 'My Profile',
  'course-fees': 'Course Fee Management',
  students: 'Student Accounts (All Centers)',
  employees: 'Employees (All Centers)',
  expenses: 'Expenses (All Centers)',
  batches: 'Batches (All Centers)',
  attendance: 'Attendance (All Centers)',
  reports: 'Reports (All Centers)',
}

import { getCourseMastersPageTitle } from '@/lib/course-masters-nav'
import { getWebsiteHomePageTitle } from '@/lib/website-home-nav'

export function getSuperAdminPageTitle(pathname: string | null): string {
  if (!pathname) return 'Dashboard'
  if (pathname.includes('/super-admin/settings')) return 'Settings'
  if (pathname.includes('/super-admin/course-masters')) {
    return getCourseMastersPageTitle(pathname)
  }
  if (pathname.includes('/super-admin/website-home')) {
    return getWebsiteHomePageTitle(pathname)
  }
  const segments = pathname.split('/').filter(Boolean)
  const section = segments[1] === 'super-admin' ? segments[2] || 'dashboard' : 'dashboard'
  return (
    SUPER_ADMIN_PAGE_META[section] ||
    section.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

export function isSuperAdminAuthRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return (
    pathname.includes('/super-admin/login') ||
    pathname.includes('/super-admin/forgot-password') ||
    pathname.includes('/super-admin/reset-password')
  )
}
