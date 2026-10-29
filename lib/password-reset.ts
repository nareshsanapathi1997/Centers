import crypto from 'crypto'
import pool from './db'
import { sendEmail } from './email'
import { renderEmailTemplate } from './email-template-renderer'
import { withBasePath } from '@/lib/with-base-path'

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Only the hash is stored, so a database leak cannot be replayed to take over
 * accounts. The plaintext token exists only in the emailed link.
 *
 * SHA-256 hex is 64 characters — the same length as the token it replaces — so
 * the existing `token` column needs no schema change. Reset links issued before
 * this change stop working, which is bounded by the 1 hour expiry.
 */
export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const hashToken = hashResetToken

/**
 * Create a password reset token
 */
export async function createPasswordResetToken(
  userType: 'admin' | 'super_admin',
  userId: number,
  email: string
): Promise<string | null> {
  try {
    // Delete any existing unused tokens for this user
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_type = $1 AND user_id = $2 AND used = false',
      [userType, userId]
    )

    // Generate new token
    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // Token expires in 1 hour

    await pool.query(
      `INSERT INTO password_reset_tokens (user_type, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [userType, userId, hashToken(token), expiresAt]
    )

    // Get user details for email
    let userDetails: any = null
    if (userType === 'admin') {
      const result = await pool.query(
        'SELECT username, full_name FROM center_admins WHERE id = $1',
        [userId]
      )
      userDetails = result.rows[0]
    } else {
      const result = await pool.query(
        'SELECT username, full_name FROM super_admins WHERE id = $1',
        [userId]
      )
      userDetails = result.rows[0]
    }

    // Send password reset email
    const origin = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3600').replace(/\/+$/, '')
    const resetPath = withBasePath(
      `/${userType === 'admin' ? 'admin' : 'super-admin'}/reset-password?token=${token}`
    )
    const resetUrl = `${origin}${resetPath}`

    // Try to use template from database, fallback to hardcoded template
    const template = await renderEmailTemplate('password_reset', {
      user_name: userDetails?.full_name || userDetails?.username || 'User',
      user_type: userType === 'admin' ? 'Center Admin' : 'Super Admin',
      reset_url: resetUrl,
    })

    if (template) {
      await sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      })
    } else {
      // Fallback to hardcoded template
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset Request</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Password Reset Request</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <p>Hello ${userDetails?.full_name || userDetails?.username || 'User'},</p>
            <p>We received a request to reset your password for your ${userType === 'admin' ? 'Center Admin' : 'Super Admin'} account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply to this message.</p>
          </div>
        </body>
        </html>
      `

      await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        html: emailHtml,
      })
    }

    return token
  } catch (error) {
    console.error('Error creating password reset token:', error)
    return null
  }
}

/**
 * Verify and use password reset token
 */
export async function verifyPasswordResetToken(token: string): Promise<{
  valid: boolean
  userType?: 'admin' | 'super_admin'
  userId?: number
  error?: string
}> {
  try {
    const result = await pool.query(
      `SELECT user_type, user_id, expires_at, used 
       FROM password_reset_tokens 
       WHERE token = $1`,
      [hashToken(token)]
    )

    if (result.rows.length === 0) {
      return { valid: false, error: 'Invalid token' }
    }

    const tokenData = result.rows[0]

    if (tokenData.used) {
      return { valid: false, error: 'Token has already been used' }
    }

    if (new Date() > new Date(tokenData.expires_at)) {
      return { valid: false, error: 'Token has expired' }
    }

    return {
      valid: true,
      userType: tokenData.user_type,
      userId: tokenData.user_id,
    }
  } catch (error) {
    console.error('Error verifying password reset token:', error)
    return { valid: false, error: 'Error verifying token' }
  }
}

/**
 * Mark password reset token as used
 */
export async function markTokenAsUsed(token: string): Promise<void> {
  try {
    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE token = $1',
      [hashToken(token)]
    )
  } catch (error) {
    console.error('Error marking token as used:', error)
  }
}
