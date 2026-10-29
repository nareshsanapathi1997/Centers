import SuperAdminExpenseDetailClient from '@/components/admin/expenses/SuperAdminExpenseDetailClient'

export default function SuperAdminExpenseDetailPage({ params }: { params: { id: string } }) {
  return <SuperAdminExpenseDetailClient expenseId={params.id} />
}
