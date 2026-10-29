import { NextRequest, NextResponse } from 'next/server'
import { completePaymentFromGateway } from '@/lib/course-fees-payments'
import { verifyRazorpayWebhook } from '@/lib/razorpay'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!verifyRazorpayWebhook(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(rawBody) as {
      event: string
      payload?: { payment?: { entity?: { id: string; order_id: string; notes?: { payment_id?: string } } } }
    }

    if (event.event === 'payment.captured') {
      const entity = event.payload?.payment?.entity
      if (entity?.notes?.payment_id) {
        await completePaymentFromGateway({
          paymentId: Number(entity.notes.payment_id),
          transactionId: entity.id,
          gatewayResponse: entity as unknown as Record<string, unknown>,
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Razorpay webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
