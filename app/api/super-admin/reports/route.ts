import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminPermission } from '@/lib/super-admin-access'
import { parseQuery, pageMeta } from '@/lib/api-validation'
import { serverError } from '@/lib/api-response'
import { superAdminReportsQuery } from '@/lib/reports-validation'
import { reportToCsv, runReport, type ReportType } from '@/lib/reports-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const readPerm = await requireSuperAdminPermission(request, 'reports', 'read')
    if (!readPerm.ok) return readPerm.response

    const parsed = parseQuery(request, superAdminReportsQuery)
    if (!parsed.ok) return parsed.response

    const { type, centerId, search, dateFrom, dateTo, export: exportFmt, page, pageSize, limit, offset } =
      parsed.data

    if (exportFmt === 'csv') {
      const exportPerm = await requireSuperAdminPermission(request, 'reports', 'export')
      if (!exportPerm.ok) return exportPerm.response

      const payload = await runReport(type as ReportType, {
        centerId,
        search,
        dateFrom,
        dateTo,
        limit: 5000,
        offset: 0,
      })
      const csv = reportToCsv(type, payload as Record<string, unknown>)
      const suffix = centerId ? `-center-${centerId}` : '-all-centers'
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="report-${type}${suffix}.csv"`,
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
    return serverError('super-admin-reports', error)
  }
}
