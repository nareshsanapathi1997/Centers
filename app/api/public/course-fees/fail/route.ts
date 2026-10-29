import { NextRequest, NextResponse } from 'next/server'
import { markPaymentFailed } from '@/lib/course-fees-payments'
import { checkRateLimit, clientIp } from '@/lib/payment-rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    if (!checkRateLimit(`fail:${ip}`, 20, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const paymentId = Number(body.payment_id)
    if (!paymentId) return NextResponse.json({ error: 'payment_id required' }, { status: 400 })

    await markPaymentFailed(paymentId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark failed error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
