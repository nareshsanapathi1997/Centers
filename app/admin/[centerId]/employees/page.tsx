import AdminEmployeesPageClient from '@/components/admin/employees/AdminEmployeesPageClient'

export default function AdminEmployeesPage({ params }: { params: { centerId: string } }) {
  return <AdminEmployeesPageClient centerId={params.centerId} />
}
