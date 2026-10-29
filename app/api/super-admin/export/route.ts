import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const { exportType, dataType, centerId } = await request.json()

    let data: any[] = []
    let headers: string[] = []
    let filename = 'export'

    // Fetch data based on dataType
    switch (dataType) {
      case 'contact_submissions':
        if (centerId) {
          const result = await pool.query(
            'SELECT cs.*, c.name as center_name FROM contact_submissions cs LEFT JOIN centers c ON cs.center_id = c.id WHERE cs.center_id = $1 ORDER BY cs.created_at DESC',
            [centerId]
          )
          data = result.rows
        } else {
          const result = await pool.query(
            'SELECT cs.*, c.name as center_name FROM contact_submissions cs LEFT JOIN centers c ON cs.center_id = c.id ORDER BY cs.created_at DESC'
          )
          data = result.rows
        }
        headers = ['ID', 'Center Name', 'Full Name', 'Email', 'Phone', 'Course Name', 'Message', 'Is Read', 'Created At']
        filename = centerId ? `contact-submissions-center-${centerId}` : 'contact-submissions-all'
        break

      case 'centers':
        const centersResult = await pool.query('SELECT * FROM centers ORDER BY created_at DESC')
        data = centersResult.rows
        headers = ['ID', 'Slug', 'Name', 'Description', 'Email', 'Phone', 'Address', 'Is Active', 'Created At']
        filename = 'centers'
        break

      case 'analytics':
        const analyticsResult = await pool.query(
          'SELECT * FROM analytics_tracking ORDER BY created_at DESC LIMIT 10000'
        )
        data = analyticsResult.rows
        headers = ['ID', 'Center ID', 'Event Type', 'Entity Type', 'Entity ID', 'IP Address', 'User Agent', 'Created At']
        filename = 'analytics'
        break

      default:
        return NextResponse.json({ error: 'Invalid data type' }, { status: 400 })
    }

    // Format data
    const formattedData = data.map((item) => {
      const formatted: any = {}
      headers.forEach((header) => {
        const key = header.toLowerCase().replace(/\s+/g, '_')
        formatted[header] = item[key] !== null && item[key] !== undefined ? String(item[key]) : ''
      })
      return formatted
    })

    // Generate export
    if (exportType === 'csv') {
      const csv = generateCSV({ headers, data: formattedData })
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })
    } else if (exportType === 'excel') {
      const csv = generateExcelCSV({ headers, data: formattedData })
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="${filename}.xls"`,
        },
      })
    } else if (exportType === 'pdf') {
      const html = generatePDF({ headers, data: formattedData, filename })
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      })
    }

    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateCSV(options: { headers: string[]; data: any[] }): string {
  const { headers, data } = options
  const rows = [headers.join(',')]
  data.forEach((item) => {
    const row = headers.map((h) => {
      const value = item[h] || ''
      if (String(value).includes(',') || String(value).includes('"')) {
        return `"${String(value).replace(/"/g, '""')}"`
      }
      return value
    })
    rows.push(row.join(','))
  })
  return rows.join('\n')
}

function generateExcelCSV(options: { headers: string[]; data: any[] }): string {
  const { headers, data } = options
  const rows = [headers.join('\t')]
  data.forEach((item) => {
    const row = headers.map((h) => String(item[h] || ''))
    rows.push(row.join('\t'))
  })
  return rows.join('\n')
}

function generatePDF(options: { headers: string[]; data: any[]; filename: string }): string {
  const { headers, data, filename } = options
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${filename}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #667eea; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        h1 { color: #333; }
      </style>
    </head>
    <body>
      <h1>${filename}</h1>
      <p>Generated on: ${new Date().toLocaleString()}</p>
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>
  `
  data.forEach((item) => {
    html += '<tr>'
    headers.forEach((h) => {
      html += `<td>${String(item[h] || '')}</td>`
    })
    html += '</tr>'
  })
  html += '</tbody></table></body></html>'
  return html
}
