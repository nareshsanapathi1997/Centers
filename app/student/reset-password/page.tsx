import { Suspense } from 'react'
import StudentResetPasswordForm from '@/components/student/StudentResetPasswordForm'

export default function CorporateStudentResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <StudentResetPasswordForm global />
    </Suspense>
  )
}
