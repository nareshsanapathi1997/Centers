'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Sparkles,
  Home,
  Building2,
  MapPin,
  BarChart3,
  Inbox,
  UserCog,
  User,
  Users,
  Search,
  Mail,
  Send,
  CheckCircle2,
  Settings,
  Menu,
  X,
  Activity,
  GraduationCap,
  BookOpen,
  Bell,
  ChevronDown,
  ChevronRight,
  Globe,
  Shield,
  CreditCard,
  IdCard,
  Wallet,
  FileBarChart2,
  Layers,
  CalendarCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import AdminPanelLogo from './AdminPanelLogo'
import {
  SUPER_ADMIN_SETTINGS_NAV,
  isSuperAdminSettingsItemActive,
  isSuperAdminSettingsPath,
} from '@/lib/super-admin-settings-nav'
import {
  COURSE_MASTERS_NAV,
  isCourseMastersNavItemActive,
  isCourseMastersPath,
} from '@/lib/course-masters-nav'
import {
  WEBSITE_HOME_NAV,
  isWebsiteHomeNavItemActive,
  isWebsiteHomePath,
} from '@/lib/website-home-nav'
import {
  canShowSuperAdminMenuItem,
  type SuperAdminAccessState,
} from '@/lib/use-super-admin-permissions'

type NavChildItem = {
  href: string
  label: string
  icon: LucideIcon
}

type MenuItem = {
  href: string
  label: string
  icon: LucideIcon
  children?: NavChildItem[]
  menuKey?: 'settings' | 'course_masters' | 'website_home'
}

const MENU_SECTIONS: Array<{ title: string; items: MenuItem[] }> = [
  {
    title: 'Main',
    items: [{ href: '/super-admin/dashboard', label: 'Dashboard', icon: Home }],
  },
  {
    title: 'Centers',
    items: [
      { href: '/super-admin/centers', label: 'Centers', icon: Building2 },
      { href: '/super-admin/courses', label: 'Courses', icon: GraduationCap },
      {
        href: '/super-admin/course-masters',
        label: 'Course Masters',
        icon: BookOpen,
        menuKey: 'course_masters',
        children: COURSE_MASTERS_NAV,
      },
      { href: '/super-admin/nearby-centers', label: 'Nearby Centers', icon: MapPin },
    ],
  },
  {
    title: 'Financials',
    items: [
      { href: '/super-admin/course-fees', label: 'Course Fee Management', icon: CreditCard },
      { href: '/super-admin/enrollment', label: 'Enrollment & Offers', icon: Sparkles },
      { href: '/super-admin/students', label: 'Student Accounts', icon: GraduationCap },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/super-admin/employees', label: 'Employees', icon: IdCard },
      { href: '/super-admin/expenses', label: 'Expenses', icon: Wallet },
      { href: '/super-admin/batches', label: 'Batches', icon: Layers },
      { href: '/super-admin/attendance', label: 'Attendance', icon: CalendarCheck },
    ],
  },
  {
    title: 'Insights',
    items: [
      { href: '/super-admin/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/super-admin/reports', label: 'Reports', icon: FileBarChart2 },
    ],
  },
  {
    title: 'Users',
    items: [
      { href: '/super-admin/admins', label: 'Super Admins', icon: UserCog },
      { href: '/super-admin/center-admins', label: 'Center Admins', icon: Users },
      { href: '/super-admin/roles', label: 'Roles & Permissions', icon: Shield },
    ],
  },
  {
    title: 'Communications',
    items: [
      { href: '/super-admin/contact-submissions', label: 'Contact Submissions', icon: Inbox },
      { href: '/super-admin/notifications', label: 'Notifications', icon: Bell },
      { href: '/super-admin/send-messages', label: 'Send Messages', icon: Send },
      { href: '/super-admin/email-templates', label: 'Email Templates', icon: Mail },
      { href: '/super-admin/approvals', label: 'Approvals', icon: CheckCircle2 },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { href: '/super-admin/seo', label: 'SEO Management', icon: Search },
      {
        href: '/super-admin/website-home',
        label: 'Website Home',
        icon: Globe,
        menuKey: 'website_home',
        children: WEBSITE_HOME_NAV,
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        href: '/super-admin/settings',
        label: 'Settings',
        icon: Settings,
        menuKey: 'settings',
        children: SUPER_ADMIN_SETTINGS_NAV,
      },
    ],
  },
  {
    title: 'Account',
    items: [{ href: '/super-admin/profile', label: 'My Profile', icon: User }],
  },
]

function isNavActive(pathname: string | null, href: string, menuKey?: MenuItem['menuKey']): boolean {
  if (href === '/super-admin/dashboard') return pathname === href
  if (menuKey === 'settings') return isSuperAdminSettingsPath(pathname)
  if (menuKey === 'course_masters') return isCourseMastersPath(pathname)
  if (menuKey === 'website_home') return isWebsiteHomePath(pathname)
  return Boolean(pathname?.startsWith(href))
}

function isChildNavActive(pathname: string | null, href: string, menuKey?: MenuItem['menuKey']): boolean {
  if (menuKey === 'settings') return isSuperAdminSettingsItemActive(pathname, href)
  if (menuKey === 'course_masters') return isCourseMastersNavItemActive(pathname, href)
  if (menuKey === 'website_home') return isWebsiteHomeNavItemActive(pathname, href)
  return pathname === href
}

type SuperAdminSidebarProps = {
  access?: SuperAdminAccessState | null
}

export default function SuperAdminSidebar({ access = null }: SuperAdminSidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => ({
    settings: isSuperAdminSettingsPath(pathname),
    course_masters: isCourseMastersPath(pathname),
    website_home: isWebsiteHomePath(pathname),
  }))

  useEffect(() => {
    setOpenMenus((prev) => ({
      ...prev,
      ...(isSuperAdminSettingsPath(pathname) ? { settings: true } : {}),
      ...(isCourseMastersPath(pathname) ? { course_masters: true } : {}),
      ...(isWebsiteHomePath(pathname) ? { website_home: true } : {}),
    }))
    setIsMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isMobileMenuOpen])

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const visibleSections = MENU_SECTIONS.map((section) => {
    const items = section.items
      .map((menuItem) => {
        if (menuItem.children?.length) {
          const children = menuItem.children.filter((child) =>
            canShowSuperAdminMenuItem(access, child.href)
          )
          if (children.length === 0) return null
          if (!canShowSuperAdminMenuItem(access, menuItem.href)) return null
          return { ...menuItem, children }
        }
        if (!canShowSuperAdminMenuItem(access, menuItem.href)) return null
        return menuItem
      })
      .filter(Boolean) as MenuItem[]

    return { ...section, items }
  }).filter((section) => section.items.length > 0)

  const activityLogsHref = '/super-admin/activity-logs'
  const showActivityLogs = canShowSuperAdminMenuItem(access, activityLogsHref)

  return (
    <>
      {!isMobileMenuOpen ? (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed z-[60] p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700"
          style={{
            top: 'max(0.75rem, env(safe-area-inset-top))',
            left: 'max(0.75rem, env(safe-area-inset-left))',
          }}
          aria-label="Open menu"
          aria-expanded={false}
        >
          <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
      ) : null}

      <aside
        className={`fixed top-0 left-0 z-50 h-[100dvh] w-64 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-r border-gray-200/50 dark:border-gray-700/50 shadow-xl transition-transform duration-300 lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="h-full flex flex-col">
          <div className="admin-sidebar-header">
            <div className="admin-sidebar-brand">
              <AdminPanelLogo size="md" className="admin-sidebar-brand__logo" />
              <div className="admin-sidebar-brand__meta">
                <p className="admin-sidebar-brand__label">Super Admin</p>
                <p className="admin-sidebar-brand__center">Global Management</p>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-1"
              aria-label="Close menu"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <nav className="admin-sidebar-nav flex-1 min-h-0">
            {visibleSections.map((section) => (
              <div key={section.title} className="admin-sidebar-nav__section">
                {section.title !== 'Main' ? (
                  <p className="admin-sidebar-nav__heading">{section.title}</p>
                ) : null}
                <div className="admin-sidebar-nav__list">
                  {section.items.map((menuItem) => {
                    const Icon = menuItem.icon
                    const active = isNavActive(pathname, menuItem.href, menuItem.menuKey)
                    const hasChildren = Boolean(menuItem.children?.length)
                    const menuKey = menuItem.menuKey || menuItem.href
                    const isExpanded = openMenus[menuKey] ?? false

                    if (hasChildren) {
                      return (
                        <div key={menuItem.href} className="admin-sidebar-nav__group">
                          <button
                            type="button"
                            onClick={() => toggleMenu(menuKey)}
                            className={`admin-sidebar-nav__link admin-sidebar-nav__link--parent w-full${active ? ' admin-sidebar-nav__link--active' : ''
                              }`}
                            aria-expanded={isExpanded}
                          >
                            <span className="admin-sidebar-nav__icon">
                              <Icon className={active ? 'text-white' : 'text-gray-600 dark:text-gray-400'} />
                            </span>
                            <span className="admin-sidebar-nav__label">{menuItem.label}</span>
                            <span className="admin-sidebar-nav__chevron ml-auto">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </span>
                          </button>

                          {isExpanded ? (
                            <div className="admin-sidebar-nav__sublist">
                              {menuItem.children!.map((child) => {
                                const ChildIcon = child.icon
                                const childActive = isChildNavActive(pathname, child.href, menuItem.menuKey)
                                return (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    title={child.label}
                                    className={`admin-sidebar-nav__link admin-sidebar-nav__link--sub${childActive ? ' admin-sidebar-nav__link--sub-active' : ''
                                      }`}
                                  >
                                    <span className="admin-sidebar-nav__icon admin-sidebar-nav__icon--sub">
                                      <ChildIcon className="w-3.5 h-3.5" />
                                    </span>
                                    <span className="admin-sidebar-nav__label">{child.label}</span>
                                  </Link>
                                )
                              })}
                            </div>
                          ) : null}
                        </div>
                      )
                    }

                    return (
                      <Link
                        key={menuItem.href}
                        href={menuItem.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        title={menuItem.label}
                        className={`admin-sidebar-nav__link${active ? ' admin-sidebar-nav__link--active' : ''}`}
                      >
                        <span className="admin-sidebar-nav__icon">
                          <Icon className={active ? 'text-white' : 'text-gray-600 dark:text-gray-400'} />
                        </span>
                        <span className="admin-sidebar-nav__label">{menuItem.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {showActivityLogs ? (
            <div className="admin-sidebar-footer">
              <Link
                href={activityLogsHref}
                onClick={() => setIsMobileMenuOpen(false)}
                title="Activity Logs"
                className={`admin-sidebar-nav__link${isNavActive(pathname, activityLogsHref) ? ' admin-sidebar-nav__link--active' : ''
                  }`}
              >
                <span className="admin-sidebar-nav__icon">
                  <Activity
                    className={
                      isNavActive(pathname, activityLogsHref)
                        ? 'text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    }
                  />
                </span>
                <span className="admin-sidebar-nav__label">Activity Logs</span>
              </Link>
            </div>
          ) : null}
        </div>
      </aside>

      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      ) : null}
    </>
  )
}
