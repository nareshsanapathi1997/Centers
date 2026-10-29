import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { listStudentPayments } from '@/lib/course-fees-db'
import { paymentsToCsv } from '@/lib/course-fees-utils'
import type { StudentFeePayment } from '@/lib/course-fees-types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const centerId = request.nextUrl.searchParams.get('centerId')
    const courseMasterId = request.nextUrl.searchParams.get('courseMasterId')
    const search = request.nextUrl.searchParams.get('search') || undefined
    const status = request.nextUrl.searchParams.get('status') as StudentFeePayment['status'] | undefined
    const exportCsv = request.nextUrl.searchParams.get('export') === 'csv'

    const rows = await listStudentPayments({
      centerId: centerId ? Number(centerId) : undefined,
      courseMasterId: courseMasterId ? Number(courseMasterId) : undefined,
      search,
      status: status || undefined,
    })

    if (exportCsv) {
      const csv = paymentsToCsv(rows)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="all-payments.csv"',
        },
      })
    }

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
