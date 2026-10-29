import { Suspense } from 'react'
import StudentVerifyEmailPage from './StudentVerifyEmailClient'

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <StudentVerifyEmailPage />
    </Suspense>
  )
}
