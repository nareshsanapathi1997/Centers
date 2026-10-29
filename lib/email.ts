import { BRAND } from '@/lib/brand'
import sgMail from '@sendgrid/mail'
import { renderEmailTemplate } from './email-template-renderer'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

const FROM_EMAIL = process.env.MAIL_FROM_ADDRESS || BRAND.supportEmail
const FROM_NAME = process.env.MAIL_FROM_NAME || BRAND.name

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured. Email not sent.')
      return false
    }

    const msg = {
      to: Array.isArray(options.to) ? options.to : [options.to],
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    }

    await sgMail.send(msg)
    console.log(`Email sent successfully to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`)
    return true
  } catch (error: any) {
    console.error('Error sending email:', error)
    if (error.response) {
      console.error('SendGrid error details:', error.response.body)
    }
    return false
  }
}

/**
 * Send admin login credentials email when center is created
 */
export async function sendAdminCredentialsEmail(
  adminEmail: string,
  adminName: string,
  centerName: string,
  username: string,
  password: string,
  loginUrl: string
): Promise<boolean> {
  // Try to use template from database, fallback to hardcoded template
  const template = await renderEmailTemplate('admin_credentials', {
    admin_name: adminName,
    center_name: centerName,
    username: username,
    password: password,
    login_url: loginUrl,
  })

  if (template) {
    return await sendEmail({
      to: adminEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })
  }

  // Fallback to hardcoded template
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Login Credentials - ${centerName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #fff; margin: 0;">Welcome to ${centerName}</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Dear ${adminName},</p>
        
        <p>Your admin account has been created for <strong>${centerName}</strong>. You can now access the admin panel using the credentials below:</p>
        
        <div style="background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Login URL:</td>
              <td style="padding: 8px 0;"><a href="${loginUrl}" style="color: #667eea; text-decoration: none;">${loginUrl}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Username:</td>
              <td style="padding: 8px 0; font-family: monospace; background: #f5f5f5; padding: 5px 10px; border-radius: 4px;">${username}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Password:</td>
              <td style="padding: 8px 0; font-family: monospace; background: #f5f5f5; padding: 5px 10px; border-radius: 4px;">${password}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.</p>
        </div>
        
        <p style="margin-top: 30px;">If you have any questions or need assistance, please contact the support team.</p>
        
        <p style="margin-top: 20px;">Best regards,<br><strong>${FROM_NAME} Team</strong></p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
        <p>This is an automated email. Please do not reply to this message.</p>
      </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: adminEmail,
    subject: `Admin Login Credentials - ${centerName}`,
    html,
  })
}

/**
 * Send contact form submission notification to center
 */
export async function sendContactFormNotificationToCenter(
  centerEmail: string,
  centerName: string,
  submission: {
    fullName: string
    email: string
    phone: string
    courseName?: string
    message?: string
  }
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission - ${centerName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #fff; margin: 0;">New Contact Form Submission</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Dear ${centerName} Team,</p>
        
        <p>You have received a new contact form submission from your website:</p>
        
        <div style="background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; font-weight: bold; width: 150px;">Name:</td>
              <td style="padding: 10px 0;">${submission.fullName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold;">Email:</td>
              <td style="padding: 10px 0;"><a href="mailto:${submission.email}" style="color: #667eea; text-decoration: none;">${submission.email}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold;">Phone:</td>
              <td style="padding: 10px 0;"><a href="tel:${submission.phone}" style="color: #667eea; text-decoration: none;">${submission.phone}</a></td>
            </tr>
            ${submission.courseName ? `
            <tr>
              <td style="padding: 10px 0; font-weight: bold;">Course:</td>
              <td style="padding: 10px 0;">${submission.courseName}</td>
            </tr>
            ` : ''}
            ${submission.message ? `
            <tr>
              <td style="padding: 10px 0; font-weight: bold; vertical-align: top;">Message:</td>
              <td style="padding: 10px 0;">${submission.message.replace(/\n/g, '<br>')}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <p style="margin-top: 20px;">Please respond to this inquiry at your earliest convenience.</p>
        
        <p style="margin-top: 20px;">Best regards,<br><strong>${FROM_NAME} System</strong></p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
        <p>This is an automated notification email.</p>
      </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: centerEmail,
    subject: `New Contact Form Submission - ${centerName}`,
    html,
  })
}

/**
 * Send confirmation email to user who submitted contact form
 */
export async function sendContactFormConfirmationToUser(
  userEmail: string,
  userName: string,
  centerName: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Your Interest - ${centerName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: #fff; margin: 0;">Thank You for Your Interest!</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Dear ${userName},</p>
        
        <p>Thank you for contacting <strong>${centerName}</strong>. We have received your inquiry and our team will get back to you shortly.</p>
        
        <p>We appreciate your interest in our programs and look forward to helping you achieve your educational goals.</p>
        
        <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #0d47a1;"><strong>📧 What's Next?</strong><br>
          Our team will review your inquiry and contact you within 24-48 hours. If you have any urgent questions, please feel free to reach out to us directly.</p>
        </div>
        
        <p style="margin-top: 20px;">Best regards,<br><strong>${centerName} Team</strong></p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
        <p>This is an automated confirmation email. Please do not reply to this message.</p>
      </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: userEmail,
    subject: `Thank You for Contacting ${centerName}`,
    html,
  })
}
