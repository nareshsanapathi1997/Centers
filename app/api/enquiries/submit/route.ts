import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { sendContactFormConfirmationToUser, sendContactFormNotificationToCenter } from '@/lib/email'

export const dynamic = 'force-dynamic'

type SubmitBody = {
  centerManagerId?: number | string
  fullName?: string
  email?: string
  phone?: string
  courseName?: string
  message?: string
  formSource?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitBody
    const centerManagerId = Number.parseInt(String(body.centerManagerId ?? ''), 10)
    const fullName = String(body.fullName ?? '').trim()
    const phone = String(body.phone ?? '').trim()
    const email = String(body.email ?? '').trim()
    const courseName = String(body.courseName ?? '').trim() || null
    const userMessage = String(body.message ?? '').trim()
    const formSource = String(body.formSource ?? 'Centre - Enquiry').trim()

    if (!Number.isFinite(centerManagerId) || centerManagerId <= 0) {
      return NextResponse.json({ error: 'Valid center ID is required' }, { status: 400 })
    }
    if (!fullName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!phone || phone.length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number is required' }, { status: 400 })
    }

    const centerResult = await pool.query('SELECT id, name, email FROM centers WHERE id = $1', [
      centerManagerId,
    ])
    if (centerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }
    const center = centerResult.rows[0] as { id: number; name: string; email: string | null }

    const messageParts = [userMessage, formSource !== 'Centre - Enquiry' ? `Source: ${formSource}` : '']
      .filter(Boolean)
      .join('\n\n')

    const result = await pool.query(
      `INSERT INTO contact_submissions (center_id, full_name, email, phone, course_name, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [centerManagerId, fullName, email || '—', phone, courseName, messageParts || null],
    )

    try {
      if (center.email) {
        await sendContactFormNotificationToCenter(center.email, center.name, {
          fullName,
          email: email || 'Not provided',
          phone,
          courseName: courseName || undefined,
          message: messageParts || undefined,
        })
      }
      if (email) {
        await sendContactFormConfirmationToUser(email, fullName, center.name)
      }
    } catch (emailError) {
      console.error('Centre enquiry email notification failed:', emailError)
    }

    return NextResponse.json({ success: true, id: result.rows[0].id })
  } catch (error) {
    console.error('Error saving centre enquiry:', error)
    return NextResponse.json({ error: 'Failed to save enquiry' }, { status: 500 })
  }
}
