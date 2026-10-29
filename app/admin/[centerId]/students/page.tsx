import { Suspense } from 'react'
import AdminStudentsPageClient from '@/components/admin/AdminStudentsPageClient'

export default function AdminStudentsPage({ params }: { params: { centerId: string } }) {
  return (
    <Suspense fallback={null}>
      <AdminStudentsPageClient centerId={params.centerId} />
    </Suspense>
  )
}
