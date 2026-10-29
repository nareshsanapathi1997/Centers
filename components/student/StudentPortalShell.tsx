'use client'

import StudentPortalProvider from '@/components/student/StudentPortalContext'
import StudentLayout from '@/components/student/StudentLayout'

interface Props {
  children: React.ReactNode
  centerId: number
  centerSlug: string
  centerName: string
}

export default function StudentPortalShell({ children, centerId, centerSlug, centerName }: Props) {
  return (
    <StudentPortalProvider centerId={centerId} centerSlug={centerSlug} centerName={centerName}>
      <StudentLayout>{children}</StudentLayout>
    </StudentPortalProvider>
  )
}
