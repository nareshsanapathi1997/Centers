import { notFound } from 'next/navigation'
import { getCenterBySlug } from '@/lib/api'
import pool from '@/lib/db'
import { getCourseMasterById } from '@/lib/course-masters-db'
import BackToTopButton from '@/components/BackToTopButton'
import CourseDetailsView from '@/components/course/CourseDetailsView'
import type { CourseDetailRecord } from '@/lib/course-detail-display'
import { getCentreCoursePrice } from '@/lib/course-centre-price'
import { getEnrollmentSettings, publicEnrollmentSettings } from '@/lib/enrollment-settings'

export const revalidate = 120

async function getCourseMasterByKey(key: string) {
  const numericId = Number.parseInt(key, 10)
  if (Number.isFinite(numericId) && numericId > 0) {
    return getCourseMasterById(numericId)
  }
  const result = await pool.query(
    `SELECT id FROM course_masters WHERE slug = $1 AND is_active = true LIMIT 1`,
    [key]
  )
  const id = result.rows[0]?.id
  if (!id) return null
  return getCourseMasterById(Number(id))
}

export default async function CenterProgramDetailsPage({
  params,
}: {
  params: { slug: string; courseKey: string }
}) {
  const courseKey = decodeURIComponent(params.courseKey).trim()
  if (!courseKey) notFound()

  const [center, course] = await Promise.all([
    getCenterBySlug(params.slug),
    getCourseMasterByKey(courseKey),
  ])
  if (!center || !course) notFound()

  const contactPath = `/${params.slug}/contact`
  const centerId = Number((center as { id?: number }).id)
  let enrollSettings = null
  let centrePrice = null
  if (Number.isFinite(centerId) && centerId > 0) {
    try {
      const s = await getEnrollmentSettings(centerId)
      enrollSettings = publicEnrollmentSettings(s)
      centrePrice = await getCentreCoursePrice(Number(course.id), centerId, s.max_installments || 12)
    } catch (err) {
      console.error('program page enrollment settings failed', err)
    }
  }

  return (
    <>
      <main id="main-content" className="corporate-home bg-pub-paper text-pub-ink">
        <CourseDetailsView
          course={course as CourseDetailRecord}
          centerSlug={params.slug}
          centerName={center.name}
          contactPath={contactPath}
          centrePrice={centrePrice}
          enrollSettings={enrollSettings}
        />
      </main>
      <BackToTopButton />
    </>
  )
}
