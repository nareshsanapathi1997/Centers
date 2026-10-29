import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { centerHasCatalogCourses } from '@/lib/center-section-config'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '0', 10)
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, centerId, 'enquiries', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const result = await pool.query<{
      news_count: string
      courses_count: string
      enquiries_count: string
      new_enquiries_count: string
      gallery_count: string
      blog_count: string
      testimonials_count: string
      users_count: string
      is_active: boolean | null
      center_name: string | null
      center_slug: string | null
    }>(
      `SELECT
        (SELECT COUNT(*)::text FROM news_items WHERE center_id = $1) AS news_count,
        (SELECT COUNT(*)::text FROM courses WHERE center_id = $1) AS courses_count,
        (SELECT COUNT(*)::text FROM contact_submissions WHERE center_id = $1) AS enquiries_count,
        (SELECT COUNT(*)::text FROM contact_submissions WHERE center_id = $1 AND is_read = FALSE) AS new_enquiries_count,
        (SELECT COUNT(*)::text FROM gallery_images WHERE center_id = $1) AS gallery_count,
        (SELECT COUNT(*)::text FROM blog_posts WHERE center_id = $1) AS blog_count,
        (SELECT COUNT(*)::text FROM text_testimonials WHERE center_id = $1) AS testimonials_count,
        (SELECT COUNT(*)::text FROM center_admins WHERE center_id = $1 AND is_active = TRUE) AS users_count,
        c.is_active,
        c.name AS center_name,
        c.slug AS center_slug
      FROM centers c
      WHERE c.id = $1`,
      [centerId]
    )

    const row = result.rows[0]
    if (!row) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }

    const n = (v: string | undefined) => parseInt(v || '0', 10) || 0
    const catalogCoursesAvailable = await centerHasCatalogCourses(String(row.center_slug ?? ''))

    return NextResponse.json({
      newsCount: n(row.news_count),
      coursesCount: n(row.courses_count),
      enquiriesCount: n(row.enquiries_count),
      newEnquiriesCount: n(row.new_enquiries_count),
      galleryCount: n(row.gallery_count),
      blogCount: n(row.blog_count),
      testimonialsCount: n(row.testimonials_count),
      usersCount: n(row.users_count),
      isActive: row.is_active !== false,
      centerName: row.center_name ?? '',
      catalogCoursesAvailable,
    })
  } catch (error) {
    console.error('dashboard-stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
