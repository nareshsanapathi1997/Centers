import SuperAdminBatchDetailClient from '@/components/admin/batches/SuperAdminBatchDetailClient'

export default function SuperAdminBatchDetailPage({ params }: { params: { id: string } }) {
  return <SuperAdminBatchDetailClient batchId={params.id} />
}
