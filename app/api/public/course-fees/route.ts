import { NextRequest, NextResponse } from 'next/server'
import {
  getCenterIdBySlug,
  getCourseMasterIdBySlugOrId,
  resolvePublicCourseFee,
} from '@/lib/course-fees-db'
import { getPaidInstallmentNumbers } from '@/lib/course-fees-payments'
import { isOnlinePaymentEnabled } from '@/lib/razorpay'
import { getEnrollmentSettings, publicEnrollmentSettings } from '@/lib/enrollment-settings'
import { getBatchSeatInfo } from '@/lib/enrollment-engine'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const centerSlug = request.nextUrl.searchParams.get('centerSlug')
    const courseKey = request.nextUrl.searchParams.get('courseKey')
    const batchIdParam = request.nextUrl.searchParams.get('batchId')
    const studentMobile = request.nextUrl.searchParams.get('studentMobile') || ''
    const batchId = batchIdParam ? Number(batchIdParam) : null

    if (!centerSlug || !courseKey) {
      return NextResponse.json({ error: 'centerSlug and courseKey are required' }, { status: 400 })
    }

    const centerId = await getCenterIdBySlug(centerSlug)
    if (!centerId) return NextResponse.json({ error: 'Center not found' }, { status: 404 })

    const course = await getCourseMasterIdBySlugOrId(courseKey)
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    const resolved = await resolvePublicCourseFee(
      course.id,
      centerId,
      batchId && Number.isFinite(batchId) ? batchId : null
    )
    if (!resolved) {
      return NextResponse.json({ error: 'Fee structure not available for this center' }, { status: 404 })
    }

    let paid_installments: number[] = []
    if (studentMobile.trim() && resolved.fee) {
      paid_installments = await getPaidInstallmentNumbers({
        centerId,
        courseMasterId: course.id,
        studentMobile,
      })
    }

    const settings = await getEnrollmentSettings(centerId)
    const seatInfo = await getBatchSeatInfo(
      centerId,
      (resolved.batches || []).map((b: { id: number }) => Number(b.id))
    )
    const seats: Record<number, { capacity: number | null; left: number | null; full: boolean; low: boolean }> = {}
    for (const [id, info] of Object.entries(seatInfo)) {
      const low = info.left != null && info.left > 0 && info.left <= settings.low_seats_threshold
      seats[Number(id)] = {
        capacity: settings.show_seats_left ? info.capacity : null,
        left: settings.show_seats_left || info.left === 0 ? info.left : null,
        full: info.left === 0,
        low,
      }
    }

    return NextResponse.json({
      ...resolved,
      online_payment_enabled: isOnlinePaymentEnabled(),
      paid_installments,
      seats,
      checkout: publicEnrollmentSettings(settings),
    })
  } catch (error) {
    console.error('Error resolving public fee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
