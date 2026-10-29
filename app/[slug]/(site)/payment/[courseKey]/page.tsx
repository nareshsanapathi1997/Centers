import { notFound } from 'next/navigation'
import CenterPaymentClient from '@/components/payment/CenterPaymentClient'
import { getCourseMasterIdBySlugOrId, isCourseAssignedToCenter } from '@/lib/course-fees-db'
import pool from '@/lib/db'

type PageProps = {
  params: Promise<{ slug: string; courseKey: string }>
}

export default async function CenterPaymentPage({ params }: PageProps) {
  const { slug, courseKey } = await params

  const centerResult = await pool.query(
    'SELECT id, name FROM centers WHERE slug = $1 AND is_active = true',
    [slug]
  )
  if (!centerResult.rows[0]) notFound()

  const course = await getCourseMasterIdBySlugOrId(courseKey)
  if (!course) notFound()
  // Reject cross-centre URLs: centre A slug + a course only centre B offers.
  if (!(await isCourseAssignedToCenter(course.id, centerResult.rows[0].id))) notFound()

  return (
    <CenterPaymentClient centerSlug={slug} courseKey={courseKey} courseTitle={course.title} />
  )
}
