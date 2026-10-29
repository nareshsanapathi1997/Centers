'use client'

import { usePathname } from 'next/navigation'
import SuperAdminLayout from '@/components/admin/SuperAdminLayout'
import { getSuperAdminPageTitle, isSuperAdminAuthRoute } from '@/lib/admin-page-meta'

export default function SuperAdminRouteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isSuperAdminAuthRoute(pathname)) {
    return <>{children}</>
  }

  return <SuperAdminLayout title={getSuperAdminPageTitle(pathname)}>{children}</SuperAdminLayout>
}
