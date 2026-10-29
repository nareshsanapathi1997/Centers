import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { sendContactFormNotificationToCenter, sendContactFormConfirmationToUser } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fullName, email, phone, courseId, message, centerId } = body

    // Validate required fields
    if (!fullName || !email || !phone || !centerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get course name if courseId is provided
    let courseName = null
    if (courseId) {
      const courseResult = await pool.query(
        'SELECT name FROM courses WHERE id = $1',
        [courseId]
      )
      courseName = courseResult.rows[0]?.name || null
    }

    // Get center details for email
    const centerResult = await pool.query(
      'SELECT name, email FROM centers WHERE id = $1',
      [centerId]
    )
    const center = centerResult.rows[0]

    // Insert contact submission
    await pool.query(
      `INSERT INTO contact_submissions (center_id, full_name, email, phone, course_name, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [centerId, fullName, email, phone, courseName, message || null]
    )

    // Send emails (non-blocking - don't fail if email fails)
    try {
      // Send notification to center
      if (center && center.email) {
        await sendContactFormNotificationToCenter(
          center.email,
          center.name,
          {
            fullName,
            email,
            phone,
            courseName: courseName || undefined,
            message: message || undefined,
          }
        )
      }

      // Send confirmation to user
      await sendContactFormConfirmationToUser(
        email,
        fullName,
        center?.name || 'EduSphere'
      )
    } catch (emailError) {
      console.error('Error sending contact form emails:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting contact form:', error)
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    )
  }
}
