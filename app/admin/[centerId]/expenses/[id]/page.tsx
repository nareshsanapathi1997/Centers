import AdminExpenseDetailClient from '@/components/admin/expenses/AdminExpenseDetailClient'

export default function AdminExpenseDetailPage({
  params,
}: {
  params: { centerId: string; id: string }
}) {
  return <AdminExpenseDetailClient centerId={params.centerId} expenseId={params.id} />
}
