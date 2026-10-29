import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { getPaymentById } from '@/lib/course-fees-db'
import { renderPaymentReceiptHtml } from '@/lib/payment-receipt-email'
import { buildReceiptPdf, pdfResponse } from '@/lib/receipt-pdf'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })

    const centerId = Number(request.nextUrl.searchParams.get('centerId'))
    const paymentId = Number(params.id)
    if (!centerId || !paymentId) {
      return NextResponse.json({ error: 'centerId and payment id required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, centerId, 'student_payments', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const payment = await getPaymentById(paymentId, centerId)
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    if (request.nextUrl.searchParams.get('format') === 'pdf') {
      const pdf = await buildReceiptPdf(paymentId)
      if (!pdf) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
      return pdfResponse(pdf, request.nextUrl.searchParams.get('download') === '1')
    }
    const html = renderPaymentReceiptHtml(payment)
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    console.error('Receipt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
