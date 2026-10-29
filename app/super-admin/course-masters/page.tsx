import { redirect } from 'next/navigation'
import { LEVEL_SLUGS } from '@/lib/course-masters'

export default function CourseMastersIndexPage() {
  redirect(`/super-admin/course-masters/${LEVEL_SLUGS.main_course}`)
}
