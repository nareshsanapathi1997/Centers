import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAccess } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

// POST - Send notifications and/or emails to centers
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAccess(request)
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      centerIds, // Array of center IDs, empty array means all centers
      sendNotification,
      sendEmail: shouldSendEmail,
      title,
      message,
      emailSubject,
      emailContent,
      notificationType = 'info',
      linkUrl,
    } = body

    if (!sendNotification && !shouldSendEmail) {
      return NextResponse.json(
        { error: 'At least one of sendNotification or sendEmail must be true' },
        { status: 400 }
      )
    }

    if (sendNotification && (!title || !message)) {
      return NextResponse.json(
        { error: 'Title and message are required for notifications' },
        { status: 400 }
      )
    }

    if (shouldSendEmail && (!emailSubject || !emailContent)) {
      return NextResponse.json(
        { error: 'Email subject and content are required for emails' },
        { status: 400 }
      )
    }

    // Get centers to send to
    let centersQuery = 'SELECT id, name, email FROM centers WHERE is_active = true'
    const centerParams: any[] = []
    
    if (centerIds && centerIds.length > 0) {
      centersQuery += ` AND id = ANY($1::int[])`
      centerParams.push(centerIds)
    }

    const centersResult = await pool.query(centersQuery, centerParams.length > 0 ? centerParams : [])
    const centers = centersResult.rows

    if (centers.length === 0) {
      return NextResponse.json(
        { error: 'No active centers found' },
        { status: 404 }
      )
    }

    const results = {
      notificationsSent: 0,
      emailsSent: 0,
      errors: [] as string[],
    }

    // Send notifications and/or emails to each center
    for (const center of centers) {
      try {
        // Get all admins for this center
        const adminsResult = await pool.query(
          'SELECT id FROM center_admins WHERE center_id = $1 AND is_active = true',
          [center.id]
        )
        const admins = adminsResult.rows

        // Send notifications to all admins of the center
        if (sendNotification && admins.length > 0) {
          for (const admin of admins) {
            try {
              await createNotification({
                user_type: 'admin',
                user_id: admin.id,
                center_id: center.id,
                title,
                message,
                type: notificationType,
                link_url: linkUrl || null,
              })
              results.notificationsSent++
            } catch (error) {
              console.error(`Error sending notification to admin ${admin.id}:`, error)
              results.errors.push(`Failed to send notification to admin ${admin.id} (${center.name})`)
            }
          }
        }

        // Send email to center
        if (shouldSendEmail && center.email) {
          try {
            const emailSent = await sendEmail({
              to: center.email,
              subject: emailSubject,
              html: emailContent,
            })
            if (emailSent) {
              results.emailsSent++
            } else {
              results.errors.push(`Failed to send email to ${center.name} (${center.email})`)
            }
          } catch (error) {
            console.error(`Error sending email to center ${center.id}:`, error)
            results.errors.push(`Failed to send email to ${center.name} (${center.email})`)
          }
        }
      } catch (error) {
        console.error(`Error processing center ${center.id}:`, error)
        results.errors.push(`Error processing center ${center.name}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Messages sent successfully`,
      results: {
        centersProcessed: centers.length,
        notificationsSent: results.notificationsSent,
        emailsSent: results.emailsSent,
        errors: results.errors,
      },
    })
  } catch (error: any) {
    console.error('Error sending messages:', error)
    return NextResponse.json(
      { error: 'Failed to send messages', details: error.message },
      { status: 500 }
    )
  }
}
