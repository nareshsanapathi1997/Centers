'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { stripBasePath } from '@/lib/with-base-path'

interface StudentPortalButtonProps {
  centerSlug?: string
  className?: string
}

export default function StudentPortalButton({ centerSlug, className }: StudentPortalButtonProps) {
  const pathname = stripBasePath(usePathname() || '')
  const href = centerSlug ? `/${centerSlug}/student/login` : '/student'

  if (
    pathname === '/student' ||
    pathname.startsWith('/student/') ||
    (centerSlug &&
      (pathname === `/${centerSlug}/student` || pathname.startsWith(`/${centerSlug}/student/`)))
  ) {
    return null
  }

  const btnClass = className || 'pub-btn-ink'
  const isCompact = btnClass.includes('portal-btn--compact')

  return (
    <Link href={href} className={btnClass}>
      <i className="ri-graduation-cap-line" aria-hidden="true" />
      {isCompact ? (
        <span className="visually-hidden">Student Portal</span>
      ) : (
        <span className="website-header-portal-btn__label">Student Portal</span>
      )}
    </Link>
  )
}
