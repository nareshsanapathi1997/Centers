import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { buildReceiptPdf, pdfResponse } from '@/lib/receipt-pdf'
import { checkRateLimit, clientIp } from '@/lib/payment-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Receipt PDF for the checkout success screen. Authorised by possession of both the
 * payment id and its gateway order id / receipt number (never guessable from one id).
 */
export async function GET(request: NextRequest) {
  try {
    if (!checkRateLimit(`receipt:${clientIp(request)}`, 20, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const id = Number(request.nextUrl.searchParams.get('payment_id'))
    const token = String(request.nextUrl.searchParams.get('token') || '').trim()
    if (!id || token.length < 6) return NextResponse.json({ error: 'payment_id and token required' }, { status: 400 })
    const r = await pool.query(
      `SELECT id FROM student_fee_payments WHERE id = $1 AND status IN ('completed', 'refunded')
         AND (gateway_order_id = $2 OR (gateway_order_id IS NULL AND receipt_no = $2))`,
      [id, token]
    )
    if (!r.rows[0]) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    const pdf = await buildReceiptPdf(id)
    if (!pdf) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    return pdfResponse(pdf, request.nextUrl.searchParams.get('download') === '1')
  } catch (error) {
    console.error('public receipt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
