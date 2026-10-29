'use client'

import dynamic from 'next/dynamic'

const StudentExamTake = dynamic(() => import('@/components/student/StudentExamTake'), {
  ssr: false,
  loading: () => (
    <div className="sp-exam-shell">
      <div className="sp-exam-shell__body">
        <div className="sp-skeleton" aria-busy="true" aria-label="Loading exam" />
      </div>
    </div>
  ),
})

export default function StudentExamPage() {
  return <StudentExamTake />
}
