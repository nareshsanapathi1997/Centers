'use client'

import { usePathname } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import { getAdminPageMeta } from '@/lib/admin-page-meta'

export default function AdminCenterRouteLayout({
  centerId,
  children,
}: {
  centerId: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { title, backUrl } = getAdminPageMeta(pathname, centerId)

  return (
    <AdminLayout centerId={centerId} title={title} backUrl={backUrl}>
      {children}
    </AdminLayout>
  )
}
