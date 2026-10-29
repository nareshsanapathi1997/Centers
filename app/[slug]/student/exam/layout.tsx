import { getCenterBySlug } from '@/lib/api'
import { notFound } from 'next/navigation'
import StudentExamShell from '@/components/student/StudentExamShell'

export default async function StudentExamLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const center = await getCenterBySlug(params.slug)
  if (!center) notFound()

  return (
    <StudentExamShell centerId={center.id} centerSlug={center.slug} centerName={center.name}>
      {children}
    </StudentExamShell>
  )
}
