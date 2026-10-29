/**
 * GST receipt PDF (pdf-lib, standard fonts). Centre GSTIN / legal name / billing
 * address come from Enrollment settings (Super Admin default + centre override).
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import pool from '@/lib/db'
import { getEnrollmentSettings } from '@/lib/enrollment-settings'
import { NextResponse } from 'next/server'

const ascii = (v: unknown) =>
  String(v ?? '')
    .replace(/\u20b9/g, 'Rs.')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7e]/g, '')

const money = (n: unknown) => `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export async function buildReceiptPdf(paymentId: number): Promise<{ bytes: Uint8Array; filename: string } | null> {
  const r = await pool.query(
    `SELECT p.*, c.name AS center_name, c.address AS center_address, c.phone AS center_phone, c.email AS center_email,
            cm.title AS course_title, b.batch_name
     FROM student_fee_payments p
     JOIN centers c ON c.id = p.center_id
     LEFT JOIN course_masters cm ON cm.id = p.course_master_id
     LEFT JOIN course_master_batches b ON b.id = p.batch_id
     WHERE p.id = $1`,
    [paymentId]
  )
  const p = r.rows[0]
  if (!p) return null
  const settings = await getEnrollmentSettings(Number(p.center_id))

  const doc = await PDFDocument.create()
  doc.setTitle(`Receipt ${ascii(p.receipt_no)}`)
  const page = doc.addPage([595.28, 841.89])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const indigo = rgb(0.31, 0.27, 0.9)
  const slate = rgb(0.2, 0.25, 0.33)
  const muted = rgb(0.45, 0.5, 0.58)
  const W = page.getWidth()
  let y = 800

  const text = (pg: PDFPage, s: string, x: number, yy: number, f: PDFFont = font, size = 10, color = slate) =>
    pg.drawText(ascii(s), { x, y: yy, size, font: f, color })
  const right = (s: string, xRight: number, yy: number, f: PDFFont = font, size = 10, color = slate) =>
    page.drawText(ascii(s), { x: xRight - f.widthOfTextAtSize(ascii(s), size), y: yy, size, font: f, color })

  page.drawRectangle({ x: 0, y: 770, width: W, height: 72, color: indigo })
  text(page, settings.legal_name || p.center_name, 40, 808, bold, 16, rgb(1, 1, 1))
  text(page, settings.legal_name && settings.legal_name !== p.center_name ? p.center_name : 'Fee Receipt', 40, 790, font, 10, rgb(0.9, 0.92, 1))
  right(p.status === 'refunded' ? 'REFUNDED' : 'TAX RECEIPT', W - 40, 808, bold, 12, rgb(1, 1, 1))
  right(`No. ${p.receipt_no}`, W - 40, 790, font, 10, rgb(0.9, 0.92, 1))
  y = 745

  const addr = ascii(settings.billing_address || p.center_address || '')
  const lines: string[] = []
  for (const part of addr.split(/\n|,\s*/)) {
    const last = lines[lines.length - 1]
    if (last && (last + ', ' + part).length < 60) lines[lines.length - 1] = last + ', ' + part
    else if (part.trim()) lines.push(part.trim())
  }
  for (const l of lines.slice(0, 4)) { text(page, l, 40, y, font, 9, muted); y -= 12 }
  if (p.center_phone || p.center_email) { text(page, [p.center_phone, p.center_email].filter(Boolean).join('  |  '), 40, y, font, 9, muted); y -= 12 }
  text(page, settings.gstin ? `GSTIN: ${settings.gstin}` : 'GSTIN: not registered', 40, y, bold, 9, settings.gstin ? slate : muted)

  let ry = 745
  const date = new Date(p.updated_at || p.created_at)
  for (const [k, v] of [
    ['Date', date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
    ['Status', String(p.status).toUpperCase() + (p.approval_status === 'pending' ? ' (approval pending)' : '')],
    ['Method', p.payment_method || '-'],
    ['Txn ID', p.transaction_id || '-'],
  ]) {
    right(`${k}: ${v}`, W - 40, ry, font, 9, muted)
    ry -= 12
  }

  y = Math.min(y, ry) - 24
  page.drawLine({ start: { x: 40, y }, end: { x: W - 40, y }, thickness: 0.6, color: rgb(0.85, 0.87, 0.9) })
  y -= 20
  text(page, 'BILLED TO', 40, y, bold, 8, muted)
  y -= 14
  text(page, p.student_name, 40, y, bold, 11)
  y -= 13
  text(page, [p.student_mobile, p.student_email].filter(Boolean).join('  |  '), 40, y, font, 9, muted)
  y -= 28

  page.drawRectangle({ x: 40, y: y - 6, width: W - 80, height: 22, color: rgb(0.95, 0.96, 0.99) })
  text(page, 'Description', 50, y, bold, 9)
  right('Amount', W - 50, y, bold, 9)
  y -= 26

  const gstAmount = Number(p.gst_amount || 0)
  const discount = Number(p.discount_applied || 0)
  const total = Number(p.amount_paid || p.amount_due || 0)
  const taxable = total - gstAmount
  const gross = taxable + discount
  const desc = `${p.course_title || 'Programme fee'}${p.batch_name ? ` - ${p.batch_name}` : ''}`
  const kind = p.payment_type === 'installment' ? `Installment #${p.installment_no}` : 'Full payment'
  text(page, desc.slice(0, 70), 50, y, font, 10)
  right(money(gross), W - 50, y)
  y -= 13
  text(page, kind, 50, y, font, 9, muted)
  y -= 20

  const row = (label: string, value: string, b = false, color = slate) => {
    text(page, label, 330, y, b ? bold : font, 10, color)
    right(value, W - 50, y, b ? bold : font, 10, color)
    y -= 16
  }
  if (Number(p.coupon_code ? discount - Number(p.scholarship_discount || 0) - Number(p.referral_discount || 0) : 0) > 0) {
    row(`Coupon ${p.coupon_code}`, `- ${money(discount - Number(p.scholarship_discount || 0) - Number(p.referral_discount || 0))}`, false, muted)
  }
  if (Number(p.scholarship_discount) > 0) row('Scholarship', `- ${money(p.scholarship_discount)}`, false, muted)
  if (Number(p.referral_discount) > 0) row(`Referral ${p.referral_code || ''}`, `- ${money(p.referral_discount)}`, false, muted)
  if (!p.coupon_code && !Number(p.scholarship_discount) && !Number(p.referral_discount) && discount > 0) row('Discount', `- ${money(discount)}`, false, muted)
  row('Taxable value', money(taxable))
  const rate = Number(p.gst_rate || 0)
  if (gstAmount > 0) {
    row(`CGST @ ${rate / 2}%`, money(gstAmount / 2))
    row(`SGST @ ${rate / 2}%`, money(gstAmount - gstAmount / 2))
  }
  y -= 4
  page.drawLine({ start: { x: 330, y: y + 10 }, end: { x: W - 40, y: y + 10 }, thickness: 0.6, color: rgb(0.85, 0.87, 0.9) })
  row('Total paid', money(total), true, indigo)
  if (Number(p.refunded_amount) > 0) row('Refunded', `- ${money(p.refunded_amount)}`, false, rgb(0.75, 0.2, 0.2))

  y -= 30
  text(page, 'This is a computer-generated receipt and does not require a signature.', 40, y, font, 8, muted)
  if (gstAmount > 0) {
    y -= 11
    text(page, 'Tax shown as CGST + SGST for intra-state supply; IGST applies for inter-state supply at the same total rate.', 40, y, font, 8, muted)
  }

  const bytes = await doc.save()
  return { bytes, filename: `${ascii(p.receipt_no || `receipt-${paymentId}`).replace(/[^\w.-]+/g, '_')}.pdf` }
}

export function pdfResponse(pdf: { bytes: Uint8Array; filename: string }, download: boolean) {
  return new NextResponse(Buffer.from(pdf.bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${pdf.filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
