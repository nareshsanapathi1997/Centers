import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAccess } from '@/lib/auth'
import {
  formatApprovalSettingsResponse,
  loadApprovalSectionSettings,
  saveApprovalSectionSettings,
} from '@/lib/approval-settings'
import { mergeApprovalSectionSettings, type ApprovalSectionSettings } from '@/lib/approval-sections'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAccess(request)
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const settings = await loadApprovalSectionSettings()
    return NextResponse.json(formatApprovalSettingsResponse(settings))
  } catch (error) {
    console.error('Error fetching approval settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAccess(request)
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const incoming = (body.settings || body) as Partial<ApprovalSectionSettings>
    const merged = mergeApprovalSectionSettings(incoming)
    const saved = await saveApprovalSectionSettings(merged)

    return NextResponse.json(formatApprovalSettingsResponse(saved))
  } catch (error) {
    console.error('Error saving approval settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
