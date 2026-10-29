import { NextRequest, NextResponse } from 'next/server'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const { centerId, exportType, dataType } = await request.json()

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, parseInt(centerId), 'enquiries', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    let data: any[] = []
    let headers: string[] = []
    let filename = 'export'

    // Fetch data based on dataType
    switch (dataType) {
      case 'contact_submissions':
        const submissionsResult = await pool.query(
          'SELECT * FROM contact_submissions WHERE center_id = $1 ORDER BY created_at DESC',
          [centerId]
        )
        data = submissionsResult.rows
        headers = ['ID', 'Full Name', 'Email', 'Phone', 'Course Name', 'Message', 'Is Read', 'Created At']
        filename = `contact-submissions-${centerId}`
        break

      case 'news':
        const newsResult = await pool.query(
          'SELECT * FROM news_items WHERE center_id = $1 ORDER BY created_at DESC',
          [centerId]
        )
        data = newsResult.rows
        headers = ['ID', 'Title', 'Content', 'Link URL', 'Is New', 'Is Notification', 'Display Order', 'Is Active', 'Created At']
        filename = `news-items-${centerId}`
        break

      case 'courses':
        const coursesResult = await pool.query(
          'SELECT * FROM courses WHERE center_id = $1 ORDER BY display_order ASC',
          [centerId]
        )
        data = coursesResult.rows
        headers = ['ID', 'Name', 'Category', 'Icon Class', 'Display Order', 'Is Active', 'Created At']
        filename = `courses-${centerId}`
        break

      default:
        return NextResponse.json({ error: 'Invalid data type' }, { status: 400 })
    }

    // Format data for export
    const formattedData = data.map((item) => {
      const formatted: any = {}
      headers.forEach((header, index) => {
        const key = Object.keys(item)[index] || header.toLowerCase().replace(/\s+/g, '_')
        formatted[header] = item[key] !== null && item[key] !== undefined ? String(item[key]) : ''
      })
      return formatted
    })

    // Generate export based on type
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
        th { background-color: #4f46e5; color: white; }
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
