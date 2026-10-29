'use client'

import AdminContentCrudPage from '@/components/admin/AdminContentCrudPage'
import { FAQ_CRUD } from '@/lib/admin-content-resource-registry'

export default function FaqPage({ params }: { params: { centerId: string } }) {
  return <AdminContentCrudPage centerId={params.centerId} resource={FAQ_CRUD} />
}
