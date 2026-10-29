import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCenterIdBySlug, getCourseMasterIdBySlugOrId, isCourseAssignedToCenter } from '@/lib/course-fees-db'
import { checkRateLimit, clientIp } from '@/lib/payment-rate-limit'
import { addToWaitlist, getBatchSeatInfo } from '@/lib/enrollment-engine'
import { getEnrollmentSettings } from '@/lib/enrollment-settings'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

const Body = z.object({
  center_slug: z.string().trim().min(1).max(120),
  course_key: z.union([z.string().trim().min(1), z.number()]),
  batch_id: z.coerce.number().int().positive().nullish(),
  student_name: z.string().trim().min(1, 'Name is required').max(200),
  student_mobile: z.string().trim().refine((v) => v.replace(/\D/g, '').length >= 10, 'Enter a valid 10-digit mobile'),
  student_email: z.string().trim().max(255).optional().transform((v) => v || undefined).pipe(z.string().email('Enter a valid email address').optional()),
})

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    if (!checkRateLimit(`waitlist:${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 })
    }
    const json = await request.json().catch(() => null)
    const parsed = Body.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request' }, { status: 400 })
    }
    const body = parsed.data
    const centerId = await getCenterIdBySlug(body.center_slug)
    if (!centerId) return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    const course = await getCourseMasterIdBySlugOrId(String(body.course_key))
    if (!course || !(await isCourseAssignedToCenter(course.id, centerId))) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    const settings = await getEnrollmentSettings(centerId)
    if (!settings.waitlist_enabled) {
      return NextResponse.json({ error: 'Waitlist is not open for this centre.' }, { status: 400 })
    }
    const batchId = body.batch_id ?? null
    if (batchId) {
      const b = await pool.query(`SELECT course_master_id FROM course_master_batches WHERE id = $1`, [batchId])
      if (!b.rows[0] || Number(b.rows[0].course_master_id) !== Number(course.id)) {
        return NextResponse.json({ error: 'Selected batch does not belong to this programme.' }, { status: 400 })
      }
      const info = (await getBatchSeatInfo(centerId, [batchId]))[batchId]
      if (info && info.left !== 0) {
        return NextResponse.json({ error: 'Seats are still available in this batch; you can enroll directly.' }, { status: 400 })
      }
    }
    const result = await addToWaitlist({
      centerId,
      courseMasterId: course.id,
      batchId,
      name: body.student_name,
      mobile: body.student_mobile,
      email: body.student_email ?? null,
    })
    return NextResponse.json({ ok: true, ...result }, { status: result.already ? 200 : 201 })
  } catch (error) {
    console.error('waitlist error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
