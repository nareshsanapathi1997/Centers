import ReportsHubClient from '@/components/admin/reports/ReportsHubClient'

export default function AdminReportsPage({ params }: { params: { centerId: string } }) {
  return <ReportsHubClient mode="admin" centerId={params.centerId} />
}
