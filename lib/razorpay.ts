import crypto from 'crypto'

export type RazorpayConfig = {
  keyId: string
  keySecret: string
}

export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim()
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()
  if (!keyId || !keySecret) return null
  return { keyId, keySecret }
}

export function isOnlinePaymentEnabled(): boolean {
  return getRazorpayConfig() != null && process.env.PAYMENT_GATEWAY !== 'manual'
}

export async function createRazorpayOrder(input: {
  amountPaise: number
  receipt: string
  notes?: Record<string, string>
}): Promise<{ id: string; amount: number; currency: string }> {
  const cfg = getRazorpayConfig()
  if (!cfg) throw new Error('Payment gateway is not configured')

  const auth = Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString('base64')
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: 'INR',
      receipt: input.receipt.slice(0, 40),
      notes: input.notes || {},
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.description || 'Failed to create payment order')
  }
  return { id: data.id, amount: data.amount, currency: data.currency }
}

export function verifyRazorpaySignature(input: {
  orderId: string
  paymentId: string
  signature: string
}): boolean {
  const cfg = getRazorpayConfig()
  if (!cfg) return false
  const body = `${input.orderId}|${input.paymentId}`
  const expected = crypto.createHmac('sha256', cfg.keySecret).update(body).digest('hex')
  return expected === input.signature
}

export function verifyRazorpayWebhook(body: string, signature: string | null): boolean {
  const cfg = getRazorpayConfig()
  if (!cfg || !signature) return false
  const expected = crypto.createHmac('sha256', cfg.keySecret).update(body).digest('hex')
  return expected === signature
}
