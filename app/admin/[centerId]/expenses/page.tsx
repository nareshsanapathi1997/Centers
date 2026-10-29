import AdminExpensesPageClient from '@/components/admin/expenses/AdminExpensesPageClient'

export default function AdminExpensesPage({ params }: { params: { centerId: string } }) {
  return <AdminExpensesPageClient centerId={params.centerId} />
}
