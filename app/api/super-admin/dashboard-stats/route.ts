import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const [totalsResult, centersResult] = await Promise.all([
      pool.query<{
        total_centers: string
        active_centers: string
        total_admins: string
        total_students: string
        total_courses: string
        total_enquiries: string
        total_gallery: string
        total_blog_posts: string
      }>(`SELECT
        (SELECT COUNT(*)::text FROM centers) AS total_centers,
        (SELECT COUNT(*)::text FROM centers WHERE is_active = TRUE) AS active_centers,
        (SELECT COUNT(*)::text FROM center_admins WHERE is_active = TRUE) AS total_admins,
        (SELECT COUNT(*)::text FROM students) AS total_students,
        (SELECT COUNT(*)::text FROM courses WHERE is_active = TRUE) AS total_courses,
        (SELECT COUNT(*)::text FROM contact_submissions) AS total_enquiries,
        (SELECT COUNT(*)::text FROM gallery_images WHERE is_active = TRUE) AS total_gallery,
        (SELECT COUNT(*)::text FROM blog_posts WHERE is_published = TRUE) AS total_blog_posts
      `),
      pool.query<{
        id: number
        name: string
        slug: string
        address: string | null
        is_active: boolean | number
        students_count: string
        courses_count: string
        enquiries_count: string
        admins_count: string
        gallery_count: string
        testimonials_count: string
      }>(`SELECT
        c.id,
        c.name,
        c.slug,
        c.address,
        c.is_active,
        (SELECT COUNT(*)::text FROM students s WHERE s.center_id = c.id) AS students_count,
        (SELECT COUNT(*)::text FROM courses co WHERE co.center_id = c.id AND co.is_active = TRUE) AS courses_count,
        (SELECT COUNT(*)::text FROM contact_submissions cs WHERE cs.center_id = c.id) AS enquiries_count,
        (SELECT COUNT(*)::text FROM center_admins ca WHERE ca.center_id = c.id AND ca.is_active = TRUE) AS admins_count,
        (SELECT COUNT(*)::text FROM gallery_images gi WHERE gi.center_id = c.id AND gi.is_active = TRUE) AS gallery_count,
        (SELECT COUNT(*)::text FROM text_testimonials tt WHERE tt.center_id = c.id AND tt.is_active = TRUE) AS testimonials_count
      FROM centers c
      ORDER BY c.id ASC`),
    ])

    const row = totalsResult.rows[0]
    const n = (v: string | undefined) => parseInt(v || '0', 10) || 0

    const centersOverview = centersResult.rows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      city: c.name.replace(/^EduSphere\s+/i, '').trim(),
      state: '',
      isActive: Boolean(c.is_active),
      studentsCount: n(c.students_count),
      coursesCount: n(c.courses_count),
      enquiriesCount: n(c.enquiries_count),
      adminsCount: n(c.admins_count),
      galleryCount: n(c.gallery_count),
      testimonialsCount: n(c.testimonials_count),
    }))

    return NextResponse.json({
      totalCenters: n(row?.total_centers),
      activeCenters: n(row?.active_centers),
      totalAdmins: n(row?.total_admins),
      totalStudents: n(row?.total_students),
      totalCourses: n(row?.total_courses),
      totalEnquiries: n(row?.total_enquiries),
      totalGallery: n(row?.total_gallery),
      totalBlogPosts: n(row?.total_blog_posts),
      centersOverview,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
