import { sendEmail } from '@/lib/email'
import pool from '@/lib/db'
import type { StudentFeePayment } from '@/lib/course-fees-types'
import { withBasePath } from '@/lib/with-base-path'

async function getPortalUrl(centerId: number): Promise<string | null> {
  const result = await pool.query('SELECT slug FROM centers WHERE id = $1', [centerId])
  const slug = result.rows[0]?.slug
  if (!slug) return null
  const origin = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3600').replace(/\/+$/, '')
  return `${origin}${withBasePath(`/${slug}/student/login`)}`
}

export function renderPaymentReceiptHtml(
  payment: StudentFeePayment,
  courseTitle?: string,
  portalUrl?: string | null
): string {
  const title = courseTitle || payment.course_title || 'Course'
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Payment Receipt ${payment.receipt_no}</title></head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #fff; margin: 0;">Payment Receipt</h1>
      </div>
      <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 10px 10px;">
        <p>Dear ${payment.student_name},</p>
        <p>Thank you for your payment for <strong>${title}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #ddd; border-radius: 8px; margin: 16px 0;">
          <tr><td style="padding: 10px; font-weight: bold;">Receipt No.</td><td style="padding: 10px; font-family: monospace;">${payment.receipt_no}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold;">Amount Paid</td><td style="padding: 10px;">₹${Number(payment.amount_paid).toLocaleString('en-IN')}</td></tr>
          ${payment.gst_amount ? `<tr><td style="padding: 10px; font-weight: bold;">GST</td><td style="padding: 10px;">₹${Number(payment.gst_amount).toLocaleString('en-IN')} (${payment.gst_rate ?? 0}%)</td></tr>` : ''}
          ${payment.discount_applied ? `<tr><td style="padding: 10px; font-weight: bold;">Discount</td><td style="padding: 10px;">₹${Number(payment.discount_applied).toLocaleString('en-IN')}</td></tr>` : ''}
          <tr><td style="padding: 10px; font-weight: bold;">Payment Type</td><td style="padding: 10px;">${payment.payment_type}${payment.installment_no ? ` #${payment.installment_no}` : ''}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold;">Method</td><td style="padding: 10px;">${payment.payment_method || '—'}</td></tr>
          ${payment.transaction_id ? `<tr><td style="padding: 10px; font-weight: bold;">Transaction ID</td><td style="padding: 10px; font-family: monospace; font-size: 12px;">${payment.transaction_id}</td></tr>` : ''}
        </table>
        ${
          portalUrl
            ? `<p style="margin: 20px 0;"><a href="${portalUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Open Student Portal</a></p>
               <p style="font-size: 13px; color: #666;">Sign in with mobile <strong>${payment.student_mobile}</strong> to view payments, installments, and study materials.</p>`
            : ''
        }
        <p style="font-size: 13px; color: #666;">Keep this email for your records.</p>
      </div>
    </body>
    </html>
  `
}

export async function sendPaymentReceiptEmail(payment: StudentFeePayment): Promise<void> {
  if (!payment.student_email?.trim()) return
  const portalUrl = await getPortalUrl(payment.center_id)
  const html = renderPaymentReceiptHtml(payment, undefined, portalUrl)
  await sendEmail({
    to: payment.student_email.trim(),
    subject: `Payment Receipt ${payment.receipt_no}`,
    html,
  })
}
