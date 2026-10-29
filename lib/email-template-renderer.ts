import pool from './db'

/**
 * Render an email template with variables
 */
export async function renderEmailTemplate(
  templateKey: string,
  variables: Record<string, string>
): Promise<{ subject: string; html: string; text: string } | null> {
  try {
    const result = await pool.query(
      'SELECT subject, html_content, text_content FROM email_templates WHERE template_key = $1 AND is_active = true',
      [templateKey]
    )

    if (result.rows.length === 0) {
      console.error(`Email template not found: ${templateKey}`)
      return null
    }

    const template = result.rows[0]
    let subject = template.subject
    let html = template.html_content
    let text = template.text_content || html.replace(/<[^>]*>/g, '')

    // Replace variables in subject, html, and text
    Object.keys(variables).forEach((key) => {
      const value = variables[key] || ''
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      subject = subject.replace(regex, value)
      html = html.replace(regex, value)
      text = text.replace(regex, value)
    })

    return { subject, html, text }
  } catch (error) {
    console.error('Error rendering email template:', error)
    return null
  }
}

/**
 * Get email template by key
 */
export async function getEmailTemplate(templateKey: string) {
  try {
    const result = await pool.query(
      'SELECT * FROM email_templates WHERE template_key = $1',
      [templateKey]
    )
    return result.rows[0] || null
  } catch (error) {
    console.error('Error fetching email template:', error)
    return null
  }
}
