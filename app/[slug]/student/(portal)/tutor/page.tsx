'use client'

import StudentPageFrame from '@/components/student/StudentPageFrame'
import StudentTutorWorkspace from '@/components/student/StudentTutorWorkspace'
import { useStudentPortal } from '@/components/student/StudentPortalContext'

export default function StudentTutorPage() {
  const { centerSlug: slug } = useStudentPortal()

  return (
    <StudentPageFrame
      className="sp-page sp-page--tutor"
      title="AI Tutor"
      subtitle="Ask a question and watch the answer stream in live."
      breadcrumbs={[
        { label: 'Dashboard', href: `/${slug}/student/dashboard` },
        { label: 'AI Tutor' },
      ]}
    >
      <StudentTutorWorkspace />
    </StudentPageFrame>
  )
}
