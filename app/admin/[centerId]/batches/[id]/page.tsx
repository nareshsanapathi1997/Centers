import AdminBatchDetailClient from '@/components/admin/batches/AdminBatchDetailClient'

export default function AdminBatchDetailPage({
  params,
}: {
  params: { centerId: string; id: string }
}) {
  return <AdminBatchDetailClient centerId={params.centerId} batchId={params.id} />
}
