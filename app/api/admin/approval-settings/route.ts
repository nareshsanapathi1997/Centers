import { NextRequest, NextResponse } from 'next/server'

import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { formatApprovalSettingsResponse, loadApprovalSectionSettings } from '@/lib/approval-settings'
import { getAdminToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '0')
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const perm = await requireAdminPermission(token, centerId, 'settings', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const settings = await loadApprovalSectionSettings()
    return NextResponse.json(formatApprovalSettingsResponse(settings))
  } catch (error) {
    console.error('Error fetching approval settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
