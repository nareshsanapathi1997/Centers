import { getCenterBySlug } from '@/lib/api'
import { notFound } from 'next/navigation'
import StudentAuthPage from '@/components/student/StudentAuthPage'

export default async function StudentRegisterPage({ params }: { params: { slug: string } }) {
  const center = await getCenterBySlug(params.slug)
  if (!center) notFound()

  return <StudentAuthPage centerSlug={center.slug} centerName={center.name} mode="register" />
}
