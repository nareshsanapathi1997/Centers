import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import pool from './db'
import { sendEmail } from './email'
import { sendSms } from './sms'

const OTP_TTL_MINUTES = 10
const MAX_OTP_ATTEMPTS = 5

function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999))
}

export async function sendStudentOtp(input: {
  centerId: number
  centerName: string
  centerSlug: string
  mobile: string
  purpose?: 'login' | 'register'
  registrationEmail?: string
}): Promise<{ sent: boolean; devOtp?: string }> {
  const mobile = normalizeMobile(input.mobile)
  if (mobile.length < 10) throw new Error('Invalid mobile number')

  if (input.purpose === 'login') {
    const existing = await pool.query(
      'SELECT id FROM students WHERE center_id = $1 AND mobile = $2 AND is_active = true',
      [input.centerId, mobile]
    )
    if (existing.rows.length === 0) {
      throw new Error('No student account found with this mobile number')
    }
  }

  if (input.purpose === 'register') {
    const existing = await pool.query(
      'SELECT id FROM students WHERE center_id = $1 AND mobile = $2',
      [input.centerId, mobile]
    )
    if (existing.rows.length > 0) {
      throw new Error('An account with this mobile already exists')
    }
  }

  const otp = generateOtp()
  const otpHash = await bcrypt.hash(otp, 8)
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_TTL_MINUTES)

  await pool.query(
    `DELETE FROM student_otp_codes WHERE center_id = $1 AND mobile = $2 AND used = false`,
    [input.centerId, mobile]
  )
  await pool.query(
    `INSERT INTO student_otp_codes (center_id, mobile, otp_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.centerId, mobile, otpHash, input.purpose || 'login', expiresAt]
  )

  const message = `Your ${input.centerName} student portal OTP is ${otp}. Valid for ${OTP_TTL_MINUTES} minutes. Do not share.`

  let sent = false

  // Try SMS first
  sent = await sendSms({ mobile, message })

  // Fallback: email if student has one on file (login) or registration email provided
  if (!sent && input.purpose === 'login') {
    const student = await pool.query(
      'SELECT email, full_name FROM students WHERE center_id = $1 AND mobile = $2',
      [input.centerId, mobile]
    )
    const email = student.rows[0]?.email?.trim()
    if (email) {
      sent = await sendEmail({
        to: email,
        subject: `Your login OTP — ${input.centerName}`,
        html: `<p>Hello ${student.rows[0]?.full_name || 'Student'},</p><p>Your OTP is <strong>${otp}</strong>. It expires in ${OTP_TTL_MINUTES} minutes.</p>`,
      })
    }
  }

  if (!sent && input.purpose === 'register' && input.registrationEmail?.trim()) {
    sent = await sendEmail({
      to: input.registrationEmail.trim(),
      subject: `Your registration OTP — ${input.centerName}`,
      html: `<p>Hello,</p><p>Your registration OTP is <strong>${otp}</strong>. It expires in ${OTP_TTL_MINUTES} minutes.</p>`,
    })
  }

  const devMode =
    process.env.STUDENT_OTP_DEV_MODE === 'true' || process.env.NODE_ENV === 'development'

  if (!sent && devMode) {
    console.log(`[DEV OTP] center=${input.centerSlug} mobile=${mobile} otp=${otp}`)
    return { sent: true, devOtp: otp }
  }

  if (!sent) {
    throw new Error('Could not send OTP. Please use password login or contact your center.')
  }

  return { sent: true }
}

export async function verifyStudentOtp(input: {
  centerId: number
  mobile: string
  otp: string
}): Promise<{ valid: boolean; studentId?: number; error?: string }> {
  const mobile = normalizeMobile(input.mobile)
  const result = await pool.query(
    `SELECT * FROM student_otp_codes
     WHERE center_id = $1 AND mobile = $2 AND used = false
     ORDER BY created_at DESC LIMIT 1`,
    [input.centerId, mobile]
  )

  if (result.rows.length === 0) {
    return { valid: false, error: 'OTP expired or not found. Request a new one.' }
  }

  const row = result.rows[0]

  if (new Date() > new Date(row.expires_at)) {
    return { valid: false, error: 'OTP has expired. Request a new one.' }
  }

  if (row.attempts >= MAX_OTP_ATTEMPTS) {
    return { valid: false, error: 'Too many attempts. Request a new OTP.' }
  }

  const match = await bcrypt.compare(input.otp.trim(), row.otp_hash)
  if (!match) {
    await pool.query('UPDATE student_otp_codes SET attempts = attempts + 1 WHERE id = $1', [row.id])
    return { valid: false, error: 'Invalid OTP' }
  }

  await pool.query('UPDATE student_otp_codes SET used = true WHERE id = $1', [row.id])

  const student = await pool.query(
    'SELECT id FROM students WHERE center_id = $1 AND mobile = $2 AND is_active = true',
    [input.centerId, mobile]
  )

  if (student.rows.length === 0) {
    return { valid: false, error: 'Student account not found' }
  }

  return { valid: true, studentId: student.rows[0].id }
}

/** Validate OTP code only (e.g. before registration). */
export async function validateStudentOtpCode(input: {
  centerId: number
  mobile: string
  otp: string
  purpose?: 'login' | 'register'
}): Promise<{ valid: boolean; error?: string }> {
  const mobile = normalizeMobile(input.mobile)
  const result = await pool.query(
    `SELECT * FROM student_otp_codes
     WHERE center_id = $1 AND mobile = $2 AND used = false
       AND purpose = $3
     ORDER BY created_at DESC LIMIT 1`,
    [input.centerId, mobile, input.purpose || 'register']
  )
  if (result.rows.length === 0) {
    return { valid: false, error: 'OTP expired or not found. Request a new one.' }
  }
  const row = result.rows[0]
  if (new Date() > new Date(row.expires_at)) {
    return { valid: false, error: 'OTP has expired. Request a new one.' }
  }
  if (row.attempts >= MAX_OTP_ATTEMPTS) {
    return { valid: false, error: 'Too many attempts. Request a new OTP.' }
  }
  const match = await bcrypt.compare(input.otp.trim(), row.otp_hash)
  if (!match) {
    await pool.query('UPDATE student_otp_codes SET attempts = attempts + 1 WHERE id = $1', [row.id])
    return { valid: false, error: 'Invalid OTP' }
  }
  await pool.query('UPDATE student_otp_codes SET used = true WHERE id = $1', [row.id])
  return { valid: true }
}

export { normalizeMobile as normalizeStudentMobile }
