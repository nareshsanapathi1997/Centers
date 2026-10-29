import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { handleEnrollmentResource } from '@/lib/enrollment-admin'

export const dynamic = 'force-dynamic'

async function handle(request: NextRequest, { params }: { params: { resource: string } }) {
  const auth = await verifySuperAdminAuth(request)
  if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  const raw = request.nextUrl.searchParams.get('centerId')
  const centerId = raw && Number(raw) > 0 ? Number(raw) : null
  const body = request.method === 'GET' || request.method === 'DELETE' ? {} : await request.json().catch(() => ({}))
  return handleEnrollmentResource(request.method, params.resource, { centerId, actor: `super:${auth.adminId ?? ''}`, isSuper: true }, body || {}, request.nextUrl.searchParams)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
