import { NextRequest, NextResponse } from 'next/server'
import { completePaymentFromGateway } from '@/lib/course-fees-payments'
import { verifyRazorpaySignature } from '@/lib/razorpay'
import { checkRateLimit, clientIp } from '@/lib/payment-rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request)
    if (!checkRateLimit(`verify:${ip}`, 20, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const paymentId = Number(body.payment_id)
    const orderId = body.razorpay_order_id
    const paymentTxnId = body.razorpay_payment_id
    const signature = body.razorpay_signature

    if (!paymentId || !orderId || !paymentTxnId || !signature) {
      return NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 })
    }

    if (!verifyRazorpaySignature({ orderId, paymentId: paymentTxnId, signature })) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    const payment = await completePaymentFromGateway({
      paymentId,
      transactionId: paymentTxnId,
      gatewayResponse: { order_id: orderId, payment_id: paymentTxnId, signature },
    })

    return NextResponse.json({
      receipt_no: payment.receipt_no,
      amount_paid: payment.amount_paid,
      status: payment.status,
    })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 400 }
    )
  }
}
