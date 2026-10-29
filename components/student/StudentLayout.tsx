'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  CreditCard,
  CalendarClock,
  User,
  LogOut,
  Menu,
  FileText,
  Bell,
  ClipboardList,
  Layers,
  CalendarCheck,
  Sparkles,
} from 'lucide-react'
import { clearStudentSession } from '@/lib/student-api'
import { useStudentPortal } from './StudentPortalContext'
import StudentNotificationsBell from './StudentNotificationsBell'
import StudentThemeToggle from './StudentThemeToggle'
import StudentEmailVerifyBanner from './StudentEmailVerifyBanner'

const NAV = [
  { href: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: 'courses', label: 'My Courses', icon: BookOpen },
  { href: 'batches', label: 'My Batches', icon: Layers },
  { href: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { href: 'materials', label: 'Study Materials', icon: FileText },
  { href: 'assessments', label: 'Quizzes & Exams', icon: ClipboardList },
  { href: 'tutor', label: 'AI Tutor', icon: Sparkles },
  { href: 'payments', label: 'Payments', icon: CreditCard },
  { href: 'installments', label: 'Installments', icon: CalendarClock },
  { href: 'notifications', label: 'Notifications', icon: Bell },
  { href: 'profile', label: 'Profile', icon: User },
]

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { centerId, centerSlug, centerName, student } = useStudentPortal()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const sidebarRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsMobileViewport(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!mobileOpen || !isMobileViewport) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [mobileOpen, isMobileViewport])

  const sidebarHidden = isMobileViewport && !mobileOpen

  useEffect(() => {
    const el = sidebarRef.current
    if (!el) return
    if (sidebarHidden) el.setAttribute('inert', '')
    else el.removeAttribute('inert')
  }, [sidebarHidden])

  const logout = () => {
    clearStudentSession()
    router.replace(`/${centerSlug}/student/login`)
  }

  const base = `/${centerSlug}/student`
  const pageTitle = NAV.find((n) => pathname?.includes(`/${n.href}`))?.label || 'Student Portal'
  const studentName = student?.fullName || ''
  const studentEmail = student?.email || ''
  const emailVerified = student?.emailVerified ?? true

  return (
    <div className="sp-portal">
      <aside
        ref={sidebarRef}
        className={`sp-portal__sidebar${mobileOpen ? ' is-open' : ''}`}
        aria-hidden={sidebarHidden || undefined}
      >
        <div className="sp-portal__sidebar-inner">
          <div className="sp-portal__sidebar-head">
            <Link href={base + "/dashboard"} className="sp-portal__wordmark">EduSphere<span>LEARNING SPACE</span></Link><p className="sp-portal__sidebar-label">Your centre</p>
            <h2 className="sp-portal__sidebar-title">{centerName}</h2>
            {studentName ? <p className="sp-portal__sidebar-user">{studentName}</p> : null}
          </div>

          <nav className="sp-portal__nav" aria-label="Student workspace">
            {NAV.map(({ href, label, icon: Icon }) => {
              const path = `${base}/${href}`
              const active = pathname?.startsWith(path)
              return (
                <Link
                  key={href}
                  href={path}
                  prefetch
                  aria-current={active ? 'page' : undefined}
                  className={`sp-portal__nav-link${active ? ' is-active' : ''}`}
                  tabIndex={sidebarHidden ? -1 : undefined}
                >
                  <Icon aria-hidden />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="sp-portal__sidebar-foot">
            <Link href={`/${centerSlug}`} prefetch={false} tabIndex={sidebarHidden ? -1 : undefined}>
              ← Centre website
            </Link>
            <button
              type="button"
              onClick={logout}
              className="sp-portal__logout"
              tabIndex={sidebarHidden ? -1 : undefined}
            >
              <LogOut aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="sp-portal__overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      ) : null}

      <div className="sp-portal__main">
        <header className="sp-portal__topbar">
          <button
            type="button"
            className="sp-portal__menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu aria-hidden />
          </button>
          <div className="sp-portal__heading">
            <span>Your learning workspace</span>
            <h2 className="sp-portal__page-title">{pageTitle}</h2>
          </div>
          <div className="sp-portal__topbar-actions"><StudentThemeToggle />
            <div className="sp-portal__identity" aria-label={studentName || 'Student account'}>
              <span>{(studentName || 'Student').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
              <div><strong>{studentName || 'Student'}</strong><small>{centerName}</small></div>
            </div>
            <StudentNotificationsBell centerId={centerId} centerSlug={centerSlug} />
          </div>
        </header>
        <main className="sp-portal__content">
          {studentEmail && !emailVerified ? (
            <StudentEmailVerifyBanner
              centerId={centerId}
              centerSlug={centerSlug}
              email={studentEmail}
            />
          ) : null}
          {children}
        </main>
      </div>

      <nav className="sp-portal__dock" aria-label="Primary student navigation">
        {NAV.filter((item) =>
          ['dashboard', 'courses', 'assessments', 'payments'].includes(item.href),
        ).map(({ href, label, icon: Icon }) => {
          const path = `${base}/${href}`
          const active = pathname?.startsWith(path)
          return (
            <Link
              key={href}
              href={path}
              prefetch
              className={`sp-portal__dock-link${active ? ' is-active' : ''}`}
            >
              <Icon aria-hidden />
              <span>{label.replace('Quizzes & Exams', 'Exams').replace('My Courses', 'Courses')}</span>
            </Link>
          )
        })}
        <button
          type="button"
          className="sp-portal__dock-link"
          onClick={() => setMobileOpen(true)}
          aria-label="Open full menu"
        >
          <Menu aria-hidden />
          <span>More</span>
        </button>
      </nav>
    </div>
  )
}
