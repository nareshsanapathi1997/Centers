import AdminAttendancePageClient from '@/components/admin/attendance/AdminAttendancePageClient'

export default function AdminAttendancePage({ params }: { params: { centerId: string } }) {
  return <AdminAttendancePageClient centerId={params.centerId} />
}
