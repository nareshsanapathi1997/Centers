import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { parseBody, parseQuery, pageMeta } from '@/lib/api-validation'
import { unauthorized, serverError, badRequest, notFound } from '@/lib/api-response'
import { logActivity } from '@/lib/activity-log'
import { assertEmployeeInCenter, getBatchById } from '@/lib/course-batches-db'
import {

  deleteAttendanceForDay,
  listAttendanceHistory,
  saveAttendanceRoster,
} from '@/lib/attendance-db'
import {
  adminAttendanceListQuery,
  attendanceDeleteDaySchema,
  attendanceSaveSchema,
} from '@/lib/attendance-validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const parsed = parseQuery(request, adminAttendanceListQuery)
    if (!parsed.ok) return parsed.response
    const {
      centerId,
      batchId,
      search,
      status,
      dateFrom,
      dateTo,
      limit,
      offset,
      page,
      pageSize,
    } = parsed.data

    const perm = await requireAdminPermission(token, centerId, 'attendance', 'read')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const { rows, total, days } = await listAttendanceHistory({
      centerId,
      batchId,
      dateFrom,
      dateTo,
      status,
      search,
      limit,
      offset,
    })

    return NextResponse.json({
      records: rows,
      days,
      pagination: pageMeta({ page, pageSize, limit, offset }, total),
    })
  } catch (error) {
    return serverError('admin-attendance-list', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const parsed = await parseBody(request, attendanceSaveSchema)
    if (!parsed.ok) return parsed.response
    const data = parsed.data

    const perm = await requireAdminPermission(
      token,
      data.centerId,
      'attendance',
      httpMethodToAction(request.method)
    )
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const batch = await getBatchById(data.batchId, data.centerId)
    if (!batch) return notFound('Batch not found')

    if (data.markedByEmployeeId) {
      const ok = await assertEmployeeInCenter(data.markedByEmployeeId, data.centerId)
      if (!ok) return badRequest('Marked-by employee must belong to this center')
    }

    const saved = await saveAttendanceRoster({
      centerId: data.centerId,
      batchId: data.batchId,
      attendanceDate: data.attendanceDate,
      markedByEmployeeId: data.markedByEmployeeId,
      entries: data.entries.map((e) => ({
        studentId: e.studentId,
        status: e.status,
        notes: e.notes,
      })),
    })

    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: data.centerId,
        action: 'create',
        entity_type: 'attendance',
        entity_id: data.batchId,
        entity_name: `${batch.name} @ ${data.attendanceDate} (${saved})`,
      },
      request
    )

    return NextResponse.json({ success: true, saved })
  } catch (error) {
    return serverError('admin-attendance-save', error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return unauthorized()

    const parsed = await parseBody(request, attendanceDeleteDaySchema)
    if (!parsed.ok) return parsed.response
    const data = parsed.data

    const perm = await requireAdminPermission(token, data.centerId, 'attendance', 'delete')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const batch = await getBatchById(data.batchId, data.centerId)
    if (!batch) return notFound('Batch not found')

    const deleted = await deleteAttendanceForDay(
      data.centerId,
      data.batchId,
      data.attendanceDate
    )

    await logActivity(
      {
        user_type: 'admin',
        user_id: perm.adminId,
        center_id: data.centerId,
        action: 'delete',
        entity_type: 'attendance',
        entity_id: data.batchId,
        entity_name: `${batch.name} @ ${data.attendanceDate}`,
      },
      request
    )

    return NextResponse.json({ success: true, deleted })
  } catch (error) {
    return serverError('admin-attendance-delete-day', error)
  }
}
