import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission } from '@/lib/admin-access'
import { parseQuery, pageMeta } from '@/lib/api-validation'
import { unauthorized, serverError } from '@/lib/api-response'
import { adminReportsQuery } from '@/lib/reports-validation'
import { reportToCsv, runReport, type ReportType } from '@/lib/reports-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const parsed = parseQuery(request, adminReportsQuery)
    if (!parsed.ok) return parsed.response

    const { centerId, type, search, dateFrom, dateTo, export: exportFmt, page, pageSize, limit, offset } =
      parsed.data

    const readPerm = await requireAdminPermission(token, centerId, 'reports', 'read')
    if (!readPerm.ok) {
      return NextResponse.json({ error: readPerm.error }, { status: readPerm.status })
    }

    if (exportFmt === 'csv') {
      const exportPerm = await requireAdminPermission(token, centerId, 'reports', 'export')
      if (!exportPerm.ok) {
        return NextResponse.json({ error: exportPerm.error }, { status: exportPerm.status })
      }

      const payload = await runReport(type as ReportType, {
        centerId,
        search,
        dateFrom,
        dateTo,
        limit: 5000,
        offset: 0,
      })
      const csv = reportToCsv(type, payload as Record<string, unknown>)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="report-${type}-center-${centerId}.csv"`,
        },
      })
    }

    const payload = await runReport(type as ReportType, {
      centerId,
      search,
      dateFrom,
      dateTo,
      limit,
      offset,
    })

    const total =
      typeof (payload as { total?: number }).total === 'number'
        ? (payload as { total: number }).total
        : Array.isArray((payload as { rows?: unknown[] }).rows)
          ? (payload as { rows: unknown[] }).rows.length
          : 0

    return NextResponse.json({
      type,
      ...payload,
      pagination: pageMeta({ page, pageSize, limit, offset }, total),
    })
  } catch (error) {
    return serverError('admin-reports', error)
  }
}
