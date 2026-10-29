'use client'

import AdminPageShell from '@/components/admin/AdminPageShell'
import CoursesManagementPanel from '@/components/admin/CoursesManagementPanel'
import PageHeader from '@/components/ui/PageHeader'
import LoadingSkeleton from '@/components/ui/LoadingSkeleton'
import { useAdminCenter } from '@/components/admin/AdminCenterContext'
import { BookOpen } from 'lucide-react'

export default function CoursesManagement({ params }: { params: { centerId: string } }) {
  const adminCenter = useAdminCenter()
  const catalogCoursesAvailable = adminCenter?.catalogCoursesAvailable ?? false
  const centerLoading = !adminCenter?.center

  return (
    <AdminPageShell>
      <div className="space-y-6">
        <PageHeader
          title={<span className="flex items-center gap-2"><BookOpen className="h-7 w-7" />Courses</span>}
          description="Manage course listings for your center website."
          breadcrumbs={[
            { label: 'Admin', href: `/admin/${params.centerId}` },
            { label: 'Courses' },
          ]}
        />
        {centerLoading ? (
          <LoadingSkeleton variant="cards" rows={3} />
        ) : (
          <CoursesManagementPanel
            centerId={params.centerId}
            mode="admin"
            catalogCoursesAvailable={catalogCoursesAvailable}
          />
        )}
      </div>
    </AdminPageShell>
  )
}
