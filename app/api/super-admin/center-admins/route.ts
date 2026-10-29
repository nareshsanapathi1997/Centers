import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/activity-log'
import { sendEmail } from '@/lib/email'
import { withBasePath } from '@/lib/with-base-path'

export const dynamic = 'force-dynamic'

// Get all center admins (with optional center filter)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const centerId = searchParams.get('centerId')

    let query = `
      SELECT ca.*, c.name as center_name
      FROM center_admins ca
      LEFT JOIN centers c ON ca.center_id = c.id
    `
    const values: any[] = []
    let paramCount = 1

    if (centerId) {
      query += ` WHERE ca.center_id = $${paramCount++}`
      values.push(parseInt(centerId))
    }

    query += ' ORDER BY ca.created_at DESC'

    const result = await pool.query(query, values)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching center admins:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create a new center admin
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const { center_id, username, email, password, full_name, role_id } = await request.json()

    if (!center_id || !username || !email || !password) {
      return NextResponse.json(
        { error: 'Center ID, username, email, and password are required' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingUsername = await pool.query(
      'SELECT id FROM center_admins WHERE username = $1',
      [username]
    )
    if (existingUsername.rows.length > 0) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
    }

    // Check if email already exists
    const existingEmail = await pool.query(
      'SELECT id FROM center_admins WHERE email = $1',
      [email]
    )
    if (existingEmail.rows.length > 0) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    // Verify center exists
    const centerResult = await pool.query('SELECT name FROM centers WHERE id = $1', [center_id])
    if (centerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // The first admin of a center becomes its owner, otherwise the center would
    // have nobody able to grant roles under fail-closed RBAC.
    const ownerResult = await pool.query(
      'SELECT 1 FROM center_admins WHERE center_id = $1 AND is_owner = true LIMIT 1',
      [center_id]
    )
    const isOwner = ownerResult.rows.length === 0

    const result = await pool.query(
      `INSERT INTO center_admins (center_id, username, email, password_hash, full_name, is_active, is_owner)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       RETURNING id, username, email, full_name, is_active, is_owner, created_at`,
      [center_id, username, email, hashedPassword, full_name || null, isOwner]
    )

    const newAdmin = result.rows[0]

    // Assign role if provided
    if (role_id) {
      try {
        await pool.query(
          `INSERT INTO admin_roles (admin_id, center_id, role_id, assigned_by_user_type, assigned_by_user_id)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (admin_id, center_id, role_id) DO NOTHING`,
          [newAdmin.id, center_id, role_id, 'super_admin', authResult.adminId]
        )
      } catch (roleError) {
        console.error('Error assigning role:', roleError)
        // Don't fail admin creation if role assignment fails
      }
    }

    // Log activity
    await logActivity(
      {
        user_type: 'super_admin',
        user_id: authResult.adminId!,
        center_id: parseInt(center_id),
        action: 'create',
        entity_type: 'center_admin',
        entity_id: newAdmin.id,
        entity_name: username,
      },
      { headers: request.headers }
    )

    // Send email with login credentials
    try {
      const origin = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3600').replace(/\/+$/, '')
      const loginUrl = `${origin}${withBasePath('/admin/login')}`
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Admin Account Created</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Admin Account Created</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <p>Hello ${full_name || username},</p>
            <p>Your admin account has been created for <strong>${centerResult.rows[0].name}</strong>.</p>
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 120px;">Username:</td>
                  <td style="padding: 8px 0;">${username}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Password:</td>
                  <td style="padding: 8px 0;">${password}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold;">Login URL:</td>
                  <td style="padding: 8px 0;"><a href="${loginUrl}" style="color: #667eea; text-decoration: none;">${loginUrl}</a></td>
                </tr>
              </table>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Login Now</a>
            </div>
            <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.</p>
          </div>
        </body>
        </html>
      `
      await sendEmail({
        to: email,
        subject: `Admin Account Created - ${centerResult.rows[0].name}`,
        html: emailHtml,
      })
    } catch (emailError) {
      console.error('Error sending admin credentials email:', emailError)
      // Don't fail admin creation if email fails
    }

    return NextResponse.json(newAdmin, { status: 201 })
  } catch (error: any) {
    console.error('Error creating center admin:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
