'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

export const LAST_CENTRE_COOKIE = 'cm_last_centre'

export default function BrandCentreLink({
  href,
  centreSlug,
  className,
  children,
}: {
  href: string
  centreSlug: string
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        document.cookie = `${LAST_CENTRE_COOKIE}=${encodeURIComponent(centreSlug)}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`
      }}
    >
      {children}
    </Link>
  )
}
