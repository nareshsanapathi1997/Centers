import AdminBatchesPageClient from '@/components/admin/batches/AdminBatchesPageClient'

export default function AdminBatchesPage({ params }: { params: { centerId: string } }) {
  return <AdminBatchesPageClient centerId={params.centerId} />
}
