import { BRAND } from '@/lib/brand'
/**
 * SMS delivery — configure via env:
 *   SMS_API_URL=https://your-provider.com/send
 *   SMS_API_KEY=your-key
 *   SMS_SENDER_ID=EDUSPH
 *   SMS_PROVIDER=auto|console
 *
 * When SMS_API_URL is set (and SMS_PROVIDER is not "console"), POSTs JSON:
 *   { mobile, message, sender, key }
 * with optional Authorization: Bearer <SMS_API_KEY>.
 *
 * Returns true only when the provider accepts the message. Returning false lets
 * student OTP fall back to email / STUDENT_OTP_DEV_MODE.
 */

interface SmsOptions {
  mobile: string
  message: string
}

export async function sendSms({ mobile, message }: SmsOptions): Promise<boolean> {
  const provider = (process.env.SMS_PROVIDER || 'auto').trim().toLowerCase()
  const digits = mobile.replace(/\D/g, '')
  const normalized = digits.length >= 10 ? digits.slice(-10) : digits
  const apiUrl = (process.env.SMS_API_URL || '').trim()

  if (provider === 'console' || !apiUrl) {
    console.log(`[SMS] to=${normalized} message=${message}`)
    return false
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.SMS_API_KEY ? { Authorization: `Bearer ${process.env.SMS_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        mobile: normalized,
        message,
        sender: process.env.SMS_SENDER_ID || BRAND.smsSenderId,
        key: process.env.SMS_API_KEY,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`SMS provider error status=${res.status} body=${body.slice(0, 300)}`)
      return false
    }
    return true
  } catch (error) {
    console.error('SMS send error:', error)
    return false
  }
}
