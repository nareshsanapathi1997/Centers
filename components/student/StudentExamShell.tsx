'use client'

import StudentPortalProvider from '@/components/student/StudentPortalContext'

interface Props {
  children: React.ReactNode
  centerId: number
  centerSlug: string
  centerName: string
}

/** Auth gate for focused exam routes — no sidebar / portal chrome. */
export default function StudentExamShell({ children, centerId, centerSlug, centerName }: Props) {
  return (
    <StudentPortalProvider centerId={centerId} centerSlug={centerSlug} centerName={centerName}>
      {children}
    </StudentPortalProvider>
  )
}
