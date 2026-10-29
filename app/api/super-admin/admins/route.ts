import { BRAND } from '@/lib/brand'
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { assignSuperAdminRole } from '@/lib/super-admin-access'
import bcrypt from 'bcryptjs'
import { sendEmail } from '@/lib/email'
import { withBasePath } from '@/lib/with-base-path'

export const dynamic = 'force-dynamic'

// Get all super admins
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const result = await pool.query(
      `SELECT sa.id, sa.username, sa.email, sa.full_name, sa.is_active, sa.created_at, sa.updated_at,
              r.id AS role_id, r.name AS role_name
       FROM super_admins sa
       LEFT JOIN super_admin_user_roles ur ON ur.super_admin_id = sa.id
       LEFT JOIN super_admin_roles r ON r.id = ur.role_id
       ORDER BY sa.created_at DESC`
    )
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching super admins:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create a new super admin
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { username, email, password, full_name, is_active, role_id } = body

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Username, email, and password are required' }, { status: 400 })
    }

    // Check if username or email already exists
    const existingUser = await pool.query(
      'SELECT id FROM super_admins WHERE username = $1 OR email = $2',
      [username, email]
    )

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create super admin
    const result = await pool.query(
      `INSERT INTO super_admins (username, email, password_hash, full_name, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, full_name, is_active, created_at`,
      [
        username,
        email,
        passwordHash,
        full_name || null,
        is_active !== false
      ]
    )

    const admin = result.rows[0]

    if (role_id !== undefined && role_id !== null && role_id !== '') {
      const parsedRoleId = parseInt(String(role_id), 10)
      if (!isNaN(parsedRoleId)) {
        await assignSuperAdminRole(admin.id, parsedRoleId)
      }
    }

    const withRole = await pool.query(
      `SELECT sa.id, sa.username, sa.email, sa.full_name, sa.is_active, sa.created_at, sa.updated_at,
              r.id AS role_id, r.name AS role_name
       FROM super_admins sa
       LEFT JOIN super_admin_user_roles ur ON ur.super_admin_id = sa.id
       LEFT JOIN super_admin_roles r ON r.id = ur.role_id
       WHERE sa.id = $1`,
      [admin.id]
    )

    // Send welcome email with login credentials (non-blocking)
    try {
      const origin = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3600').replace(/\/+$/, '')
      const loginUrl = `${origin}${withBasePath('/super-admin/login')}`
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Super Admin Account Created</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #fff; margin: 0;">Super Admin Account Created</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear ${full_name || username},</p>
            
            <p>Your Super Admin account has been created successfully. You can now access the Super Admin panel using the credentials below:</p>
            
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
            
            <p style="margin-top: 20px;">Best regards,<br><strong>${process.env.MAIL_FROM_NAME || BRAND.name} Team</strong></p>
          </div>
        </body>
        </html>
      `
      
      await sendEmail({
        to: email,
        subject: 'Super Admin Account Created',
        html,
      })
      console.log(`Super admin credentials email sent to ${email}`)
    } catch (emailError) {
      console.error('Error sending super admin credentials email:', emailError)
      // Don't fail admin creation if email fails
    }

    return NextResponse.json(withRole.rows[0] || admin, { status: 201 })
  } catch (error: any) {
    console.error('Error creating super admin:', error)
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
