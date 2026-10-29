import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdminAccess, getAdminToken } from '@/lib/auth'
import { getActivityLogs } from '@/lib/activity-log'
import { idSchema, paginationQuery, parseQuery } from '@/lib/api-validation'
import { forbidden, serverError, unauthorized } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const LogsQuery = z
  .object({
    centerId: idSchema,
    action: z.string().trim().max(60).optional(),
    entityType: z.string().trim().max(60).optional(),
    userType: z.enum(['admin', 'student', 'super_admin']).default('admin'),
  })
  // `limit` was previously unbounded, so a client could ask for every log row.
  .and(paginationQuery)

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return unauthorized('No token provided')
    }

    const parsed = parseQuery(request, LogsQuery)
    if (!parsed.ok) return parsed.response
    const { centerId, action, entityType, userType, limit, offset } = parsed.data

    const authResult = await verifyAdminAccess(token, centerId)
    if (!authResult.authorized) {
      return forbidden(authResult.error || 'Unauthorized')
    }

    const logs = await getActivityLogs({
      user_type: userType,
      user_id: userType === 'admin' ? authResult.adminId : undefined,
      center_id: centerId,
      action,
      entity_type: entityType,
      limit,
      offset,
    })

    return NextResponse.json(logs)
  } catch (error) {
    return serverError('admin-activity-logs', error)
  }
}
