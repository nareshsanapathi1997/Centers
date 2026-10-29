import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import pool from './db'
import { sendEmail } from './email'
import { createNotification } from './notifications'
import { generateStudentRegno, linkPaymentsToStudent } from './student-portal-db'
import type { StudentFeePayment } from './course-fees-types'
import { withBasePath } from './with-base-path'

function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

function generateTempPassword(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

export async function ensureStudentAccountFromPayment(
  payment: StudentFeePayment
): Promise<number | null> {
  try {
    const centerId = payment.center_id
    const mobile = normalizeMobile(payment.student_mobile)
    if (!mobile) return null

    let studentId: number

    const existing = await pool.query(
      'SELECT id FROM students WHERE center_id = $1 AND mobile = $2',
      [centerId, mobile]
    )

    if (existing.rows[0]) {
      studentId = existing.rows[0].id
    } else {
      const regno = await generateStudentRegno(centerId)
      const tempPassword = generateTempPassword()
      const passwordHash = await bcrypt.hash(tempPassword, 10)

      const insert = await pool.query(
        `INSERT INTO students (center_id, regno, full_name, email, mobile, password_hash, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id`,
        [
          centerId,
          regno,
          payment.student_name,
          payment.student_email?.trim().toLowerCase() || null,
          mobile,
          passwordHash,
        ]
      )
      studentId = insert.rows[0].id

      await sendWelcomeEmail({
        payment,
        tempPassword,
        isNewAccount: true,
      })
    }

    await pool.query(
      `UPDATE student_fee_payments SET student_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND (student_id IS NULL OR student_id = $1)`,
      [studentId, payment.id]
    )

    await linkPaymentsToStudent(studentId, centerId, mobile)

    const centerResult = await pool.query('SELECT name, slug FROM centers WHERE id = $1', [centerId])
    const center = centerResult.rows[0]
    const courseResult = await pool.query('SELECT title FROM course_masters WHERE id = $1', [
      payment.course_master_id,
    ])
    const courseTitle = courseResult.rows[0]?.title || 'your course'

    await createNotification({
      user_type: 'student',
      user_id: studentId,
      center_id: centerId,
      title: 'Payment received',
      message: `Your payment of ₹${Number(payment.amount_paid).toLocaleString('en-IN')} for ${courseTitle} was successful. Receipt: ${payment.receipt_no}`,
      type: 'success',
      link_url: center?.slug ? `/${center.slug}/student/payments` : null,
    })

    if (existing.rows[0]) {
      await sendWelcomeEmail({ payment, isNewAccount: false })
    }

    return studentId
  } catch (error) {
    console.error('ensureStudentAccountFromPayment error:', error)
    return null
  }
}

async function sendWelcomeEmail(input: {
  payment: StudentFeePayment
  tempPassword?: string
  isNewAccount: boolean
}): Promise<void> {
  const email = input.payment.student_email?.trim()
  if (!email) return

  const centerResult = await pool.query('SELECT name, slug FROM centers WHERE id = $1', [
    input.payment.center_id,
  ])
  const center = centerResult.rows[0]
  if (!center) return

  const origin = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3600').replace(/\/+$/, '')
  const portalPath = withBasePath(`/${center.slug}/student/login`)
  const portalUrl = `${origin}${portalPath}`

  let html: string
  if (input.isNewAccount && input.tempPassword) {
    html = `
      <p>Dear ${input.payment.student_name},</p>
      <p>Thank you for your payment! A student portal account has been created for you at <strong>${center.name}</strong>.</p>
      <p><strong>Login details:</strong></p>
      <ul>
        <li>Portal: <a href="${portalUrl}">${portalUrl}</a></li>
        <li>Mobile: ${input.payment.student_mobile}</li>
        <li>Temporary password: <strong>${input.tempPassword}</strong></li>
      </ul>
      <p>Please sign in and change your password from your profile.</p>
      <p>Receipt No: ${input.payment.receipt_no}</p>
    `
  } else {
    html = `
      <p>Dear ${input.payment.student_name},</p>
      <p>Your payment (Receipt ${input.payment.receipt_no}) has been recorded.</p>
      <p>View your payment history in the <a href="${portalUrl}">Student Portal</a>.</p>
    `
  }

  await sendEmail({
    to: email,
    subject: input.isNewAccount
      ? `Welcome to ${center.name} Student Portal`
      : `Payment confirmation — ${input.payment.receipt_no}`,
    html,
  })
}

export async function notifyStudentInstallmentDue(input: {
  studentId: number
  centerId: number
  centerSlug: string
  courseTitle: string
  installmentNo: number
  amount: number
  dueDate: string
}): Promise<void> {
  await createNotification({
    user_type: 'student',
    user_id: input.studentId,
    center_id: input.centerId,
    title: 'Installment due soon',
    message: `Installment #${input.installmentNo} of ₹${input.amount.toLocaleString('en-IN')} for ${input.courseTitle} is due on ${new Date(input.dueDate).toLocaleDateString('en-IN')}.`,
    type: 'warning',
    link_url: `/${input.centerSlug}/student/installments`,
  })
}

export async function notifyStudentPaymentRefunded(input: {
  payment: StudentFeePayment
  notes?: string
}): Promise<void> {
  const { payment } = input
  const centerResult = await pool.query('SELECT name, slug FROM centers WHERE id = $1', [payment.center_id])
  const center = centerResult.rows[0]
  if (!center) return

  const studentResult = await pool.query(
    `SELECT id FROM students WHERE center_id = $1 AND mobile = $2 AND is_active = true`,
    [payment.center_id, payment.student_mobile.replace(/\D/g, '').slice(-10) || payment.student_mobile]
  )
  const studentId = studentResult.rows[0]?.id
  if (!studentId) return

  await createNotification({
    user_type: 'student',
    user_id: studentId,
    center_id: payment.center_id,
    title: 'Payment refunded',
    message: `Your payment ${payment.receipt_no} of ₹${Number(payment.amount_paid).toLocaleString('en-IN')} has been refunded.${input.notes ? ` Note: ${input.notes}` : ''}`,
    type: 'warning',
    link_url: `/${center.slug}/student/payments`,
  })
}

export async function notifyStudentNewMaterial(input: {
  studentIds: number[]
  centerId: number
  centerSlug: string
  courseTitle: string
  materialTitle: string
}): Promise<void> {
  for (const studentId of input.studentIds) {
    await createNotification({
      user_type: 'student',
      user_id: studentId,
      center_id: input.centerId,
      title: 'New study material',
      message: `"${input.materialTitle}" has been added for ${input.courseTitle}.`,
      type: 'info',
      link_url: `/${input.centerSlug}/student/materials`,
    })
  }
}
