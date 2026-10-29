import type { Metadata } from 'next'
import AdminCenterRouteLayout from '@/components/admin/AdminCenterRouteLayout'
import { buildCenterAdminPanelMetadata } from '@/lib/admin-panel-metadata'

export async function generateMetadata({
  params,
}: {
  params: { centerId: string }
}): Promise<Metadata> {
  return buildCenterAdminPanelMetadata(
    params.centerId,
    'Admin Panel - Center Manager',
    'Admin Dashboard for Center Management',
  )
}

export default function CenterAdminRouteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { centerId: string }
}) {
  return <AdminCenterRouteLayout centerId={params.centerId}>{children}</AdminCenterRouteLayout>
}
