import SuperAdminEmployeeDetailClient from '@/components/admin/employees/SuperAdminEmployeeDetailClient'

export default function SuperAdminEmployeeDetailPage({ params }: { params: { id: string } }) {
  return <SuperAdminEmployeeDetailClient employeeId={params.id} />
}
