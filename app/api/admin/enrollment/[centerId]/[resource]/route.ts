import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { handleEnrollmentResource } from '@/lib/enrollment-admin'

export const dynamic = 'force-dynamic'

async function handle(request: NextRequest, { params }: { params: { centerId: string; resource: string } }) {
  const token = getAdminToken(request)
  if (!token) return NextResponse.json({ error: 'No token provided' }, { status: 401 })
  const centerId = Number(params.centerId)
  if (!centerId) return NextResponse.json({ error: 'Invalid centre' }, { status: 400 })
  const perm = await requireAdminPermission(token, centerId, 'student_payments', httpMethodToAction(request.method))
  if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })
  const body = request.method === 'GET' || request.method === 'DELETE' ? {} : await request.json().catch(() => ({}))
  const actor = `admin:${perm.adminId}`
  return handleEnrollmentResource(request.method, params.resource, { centerId, actor, isSuper: false }, body || {}, request.nextUrl.searchParams)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
