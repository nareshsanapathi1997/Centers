import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAccess } from '@/lib/auth'
import {
  loadAppThemeSettings,
  saveAppThemeSettings,
  type AppThemeSettings,
} from '@/lib/app-theme-settings'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAccess(request)
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const settings = await loadAppThemeSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching theme settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAccess(request)
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const body = (await request.json()) as Partial<AppThemeSettings>
    const saved = await saveAppThemeSettings({
      mode: body.mode === 'dark' ? 'dark' : body.mode === 'light' ? 'light' : undefined,
      force: typeof body.force === 'boolean' ? body.force : undefined,
    })

    return NextResponse.json(saved)
  } catch (error) {
    console.error('Error saving theme settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
