import { getCenterBySlug } from '@/lib/api'
import { notFound } from 'next/navigation'
import StudentPortalShell from '@/components/student/StudentPortalShell'

export default async function StudentPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const center = await getCenterBySlug(params.slug)
  if (!center) notFound()

  return (
    <StudentPortalShell centerId={center.id} centerSlug={center.slug} centerName={center.name}>
      {children}
    </StudentPortalShell>
  )
}
