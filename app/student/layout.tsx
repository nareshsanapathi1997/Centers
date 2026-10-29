import '@/app/globals.css'
import '@/app/student-portal.css'
import QueryProvider from '@/components/providers/QueryProvider'
import StudentThemeRoot from '@/components/student/StudentThemeRoot'

export default function CorporateStudentAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <StudentThemeRoot>{children}</StudentThemeRoot>
    </QueryProvider>
  )
}
