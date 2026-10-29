import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifySuperAdminAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET all email templates
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAccess(request)
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const templateKey = searchParams.get('key')
    const category = searchParams.get('category')

    if (templateKey) {
      // Get specific template by key
      const result = await pool.query(
        'SELECT * FROM email_templates WHERE template_key = $1',
        [templateKey]
      )
      return NextResponse.json(result.rows[0] || null)
    } else if (category) {
      // Get templates by category
      const result = await pool.query(
        'SELECT * FROM email_templates WHERE template_category = $1 ORDER BY template_name',
        [category]
      )
      return NextResponse.json(result.rows)
    } else {
      // Get all templates
      const result = await pool.query(
        'SELECT * FROM email_templates ORDER BY template_category, template_name'
      )
      return NextResponse.json(result.rows)
    }
  } catch (error: any) {
    console.error('Error fetching email templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email templates', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Create new email template
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAccess(request)
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      template_key,
      template_name,
      template_category,
      subject,
      html_content,
      text_content,
      description,
      variables,
      is_active,
    } = body

    if (!template_key || !template_name || !subject || !html_content) {
      return NextResponse.json(
        { error: 'template_key, template_name, subject, and html_content are required' },
        { status: 400 }
      )
    }

    // Check if template key already exists
    const existing = await pool.query(
      'SELECT id FROM email_templates WHERE template_key = $1',
      [template_key]
    )

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Template key already exists' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO email_templates (
        template_key, template_name, template_category, subject,
        html_content, text_content, description, variables, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        template_key,
        template_name,
        template_category || 'general',
        subject,
        html_content,
        text_content || null,
        description || null,
        variables ? JSON.stringify(variables) : null,
        is_active !== undefined ? is_active : true,
      ]
    )

    return NextResponse.json({
      message: 'Email template created successfully',
      data: result.rows[0],
    })
  } catch (error: any) {
    console.error('Error creating email template:', error)
    return NextResponse.json(
      { error: 'Failed to create email template', details: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Update email template
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAccess(request)
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, template_key, ...updates } = body

    if (!id && !template_key) {
      return NextResponse.json(
        { error: 'id or template_key is required' },
        { status: 400 }
      )
    }

    // Build update query dynamically
    const updateFields: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (updates.template_name !== undefined) {
      updateFields.push(`template_name = $${paramIndex++}`)
      values.push(updates.template_name)
    }
    if (updates.template_category !== undefined) {
      updateFields.push(`template_category = $${paramIndex++}`)
      values.push(updates.template_category)
    }
    if (updates.subject !== undefined) {
      updateFields.push(`subject = $${paramIndex++}`)
      values.push(updates.subject)
    }
    if (updates.html_content !== undefined) {
      updateFields.push(`html_content = $${paramIndex++}`)
      values.push(updates.html_content)
    }
    if (updates.text_content !== undefined) {
      updateFields.push(`text_content = $${paramIndex++}`)
      values.push(updates.text_content)
    }
    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`)
      values.push(updates.description)
    }
    if (updates.variables !== undefined) {
      updateFields.push(`variables = $${paramIndex++}`)
      values.push(JSON.stringify(updates.variables))
    }
    if (updates.is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`)
      values.push(updates.is_active)
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id || template_key)

    const whereClause = id ? `id = $${paramIndex}` : `template_key = $${paramIndex}`

    const result = await pool.query(
      `UPDATE email_templates SET ${updateFields.join(', ')} WHERE ${whereClause} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Email template updated successfully',
      data: result.rows[0],
    })
  } catch (error: any) {
    console.error('Error updating email template:', error)
    return NextResponse.json(
      { error: 'Failed to update email template', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete email template (only non-system templates)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAccess(request)
    if (!authResult.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const templateKey = searchParams.get('key')

    if (!id && !templateKey) {
      return NextResponse.json(
        { error: 'id or key parameter is required' },
        { status: 400 }
      )
    }

    // Check if it's a system template
    const checkResult = await pool.query(
      `SELECT is_system_template FROM email_templates WHERE ${id ? 'id = $1' : 'template_key = $1'}`,
      [id || templateKey]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (checkResult.rows[0].is_system_template) {
      return NextResponse.json(
        { error: 'Cannot delete system templates' },
        { status: 400 }
      )
    }

    await pool.query(
      `DELETE FROM email_templates WHERE ${id ? 'id = $1' : 'template_key = $1'}`,
      [id || templateKey]
    )

    return NextResponse.json({ message: 'Email template deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting email template:', error)
    return NextResponse.json(
      { error: 'Failed to delete email template', details: error.message },
      { status: 500 }
    )
  }
}
