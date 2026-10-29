import AdminEmployeeDetailClient from '@/components/admin/employees/AdminEmployeeDetailClient'

export default function AdminEmployeeDetailPage({
  params,
}: {
  params: { centerId: string; id: string }
}) {
  return <AdminEmployeeDetailClient centerId={params.centerId} employeeId={params.id} />
}
