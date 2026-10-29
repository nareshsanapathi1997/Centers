'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Settings,
  FileText,
  Image,
  Users,
  BookOpen,
  Award,
  Bell,
  Video,
  MessageSquare,
  Layers,
  Menu,
  X,
  Inbox,
  GraduationCap,
  HelpCircle,
  Info,
  User,
  Briefcase,
  Activity,
  Shield,
  IndianRupee,
  CreditCard,
  ClipboardList,
  IdCard,
  Wallet,
  FileBarChart2,
  CalendarCheck,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import AdminPanelLogo from './AdminPanelLogo'
import { canShowAdminMenuItem } from '@/lib/use-admin-permissions'
import type { AdminAccessState } from '@/lib/use-admin-permissions'

interface AdminSidebarProps {
  centerId: string
  centerName?: string
  catalogCoursesAvailable?: boolean
  logoLight?: string | null
  logoDark?: string | null
  permissions?: AdminAccessState | null
}

export default function AdminSidebar({
  centerId,
  centerName,
  catalogCoursesAvailable = false,
  logoLight,
  logoDark,
  permissions = null,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
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

  const menuSections = [
    {
      title: 'Main',
      items: [
        { href: `/admin/${centerId}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
        { href: `/admin/${centerId}/enquiries`, label: 'Enquiries', icon: Inbox },
        { href: `/admin/${centerId}/notifications`, label: 'Notifications', icon: Bell },
      ],
    },
    {
      title: 'Fees & Payments',
      items: [
        { href: `/admin/${centerId}/course-fees`, label: 'Course Pricing', icon: IndianRupee },
        { href: `/admin/${centerId}/student-payments`, label: 'Student Payments', icon: CreditCard },
        { href: `/admin/${centerId}/enrollment`, label: 'Enrollment & Offers', icon: Sparkles },
        { href: `/admin/${centerId}/students`, label: 'Student Accounts', icon: GraduationCap },
        { href: `/admin/${centerId}/course-materials`, label: 'Study Materials', icon: FileText },
        { href: `/admin/${centerId}/assessments`, label: 'Quizzes & Exams', icon: ClipboardList },
      ],
    },
    {
      title: 'Operations',
      items: [
        { href: `/admin/${centerId}/employees`, label: 'Employees', icon: IdCard },
        { href: `/admin/${centerId}/expenses`, label: 'Expenses', icon: Wallet },
        { href: `/admin/${centerId}/batches`, label: 'Batches', icon: Layers },
        { href: `/admin/${centerId}/attendance`, label: 'Attendance', icon: CalendarCheck },
        { href: `/admin/${centerId}/reports`, label: 'Reports', icon: FileBarChart2 },
      ],
    },
    {
      title: 'Content',
      items: [
        { href: `/admin/${centerId}/sections`, label: 'Sections', icon: Settings },
        { href: `/admin/${centerId}/hero`, label: 'Home Page Slider', icon: Image },
        { href: `/admin/${centerId}/news`, label: 'News & Notifications', icon: Bell },
        ...(catalogCoursesAvailable
          ? []
          : [{ href: `/admin/${centerId}/courses`, label: 'Courses', icon: BookOpen }]),
        { href: `/admin/${centerId}/results`, label: 'Results', icon: Award },
        { href: `/admin/${centerId}/testimonials`, label: 'Testimonials', icon: MessageSquare },
        // { href: `/admin/${centerId}/student-stories`, label: 'Our Stories', icon: GraduationCap },
        { href: `/admin/${centerId}/leadership`, label: 'Directors', icon: Users },
        { href: `/admin/${centerId}/senior-faculty`, label: 'Senior Faculty', icon: GraduationCap },
        { href: `/admin/${centerId}/gallery`, label: 'Gallery', icon: Image },
        // { href: `/admin/${centerId}/image-library`, label: 'Image Library', icon: Image },
        { href: `/admin/${centerId}/blog`, label: 'Blog', icon: FileText },
        { href: `/admin/${centerId}/blog-comments`, label: 'Blog Comments', icon: MessageSquare },
        { href: `/admin/${centerId}/faq`, label: 'People Also Ask', icon: HelpCircle },
        { href: `/admin/${centerId}/vacancies`, label: 'Vacancies', icon: Briefcase },
        { href: `/admin/${centerId}/about`, label: 'Get To Know Us', icon: Info },
      ],
    },
    {
      title: 'Advanced',
      items: [
        { href: `/admin/${centerId}/custom-sections`, label: 'Custom Sections', icon: Layers },
        { href: `/admin/${centerId}/settings`, label: 'Settings', icon: Settings },
        { href: `/admin/${centerId}/profile`, label: 'My Profile', icon: User },
        { href: `/admin/${centerId}/roles`, label: 'Roles & Permissions', icon: Shield },
        { href: `/admin/${centerId}/center-admins`, label: 'Center Admins', icon: Users },
      ],
    },
  ]

  const activityLogsHref = `/admin/${centerId}/activity-logs`

  const isActive = (href: string) => {
    if (href === `/admin/${centerId}/dashboard`) {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Mobile menu button — hidden while drawer is open (in-drawer close is enough) */}
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

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-[100dvh] w-64 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-r border-gray-200/50 dark:border-gray-700/50 shadow-xl transition-transform duration-300 lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar header — center name only (logo lives in top bar, same as Super Admin) */}
          <div className="admin-sidebar-header">
            <div className="admin-sidebar-brand">
              <AdminPanelLogo
                size="md"
                logoLight={logoLight}
                logoDark={logoDark}
                className="admin-sidebar-brand__logo"
              />
              <div className="admin-sidebar-brand__meta">
                <p className="admin-sidebar-brand__label">Admin Panel</p>
                <p className="admin-sidebar-brand__center">
                  {centerName || 'Center Admin'}
                </p>
              </div>
            </div>
            <button aria-label="Close"
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-1"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <nav className="admin-sidebar-nav flex-1 min-h-0">
            {menuSections.map((section) => (
              <div key={section.title} className="admin-sidebar-nav__section">
                {section.title !== 'Main' && (
                  <p className="admin-sidebar-nav__heading">{section.title}</p>
                )}
                <div className="admin-sidebar-nav__list">
                  {section.items
                    .filter((item) => canShowAdminMenuItem(permissions, item.href))
                    .map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        title={item.label}
                        className={`admin-sidebar-nav__link${active ? ' admin-sidebar-nav__link--active' : ''}`}
                      >
                        <span className="admin-sidebar-nav__icon">
                          <Icon className={active ? 'text-white' : 'text-gray-600 dark:text-gray-400'} />
                        </span>
                        <span className="admin-sidebar-nav__label">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="admin-sidebar-footer">
            <Link
              href={activityLogsHref}
              onClick={() => setIsMobileMenuOpen(false)}
              title="Activity Logs"
              className={`admin-sidebar-nav__link${isActive(activityLogsHref) ? ' admin-sidebar-nav__link--active' : ''}`}
            >
              <span className="admin-sidebar-nav__icon">
                <Activity className={isActive(activityLogsHref) ? 'text-white' : 'text-gray-600 dark:text-gray-400'} />
              </span>
              <span className="admin-sidebar-nav__label">Activity Logs</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile — above sticky header (z-20), below sidebar (z-50) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}

