import { NextRequest, NextResponse } from 'next/server'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import { getPaymentById } from '@/lib/course-fees-db'
import { renderPaymentReceiptHtml } from '@/lib/payment-receipt-email'
import { buildReceiptPdf, pdfResponse } from '@/lib/receipt-pdf'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const centerId = Number(request.nextUrl.searchParams.get('centerId'))
    const paymentId = Number(params.id)
    if (!centerId || !paymentId) {
      return NextResponse.json({ error: 'centerId and payment id required' }, { status: 400 })
    }

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 403 })
    }

    const payment = await getPaymentById(paymentId, centerId)
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    // Ensure payment belongs to this student
    const ownerCheck = await pool.query(
      `SELECT id FROM student_fee_payments
       WHERE id = $1 AND center_id = $2
         AND (student_id = $3 OR student_mobile = (SELECT mobile FROM students WHERE id = $3))`,
      [paymentId, centerId, auth.studentId]
    )
    if (ownerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (request.nextUrl.searchParams.get('format') === 'pdf') {
      const pdf = await buildReceiptPdf(paymentId)
      if (!pdf) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
      return pdfResponse(pdf, request.nextUrl.searchParams.get('download') === '1')
    }
    const html = renderPaymentReceiptHtml(payment)
    const receiptNo = String(payment.receipt_no || `payment-${paymentId}`).replace(/[^\w.-]+/g, '_')
    const disposition =
      request.nextUrl.searchParams.get('download') === '1' ? 'attachment' : 'inline'
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `${disposition}; filename="${receiptNo}.html"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Student receipt error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
