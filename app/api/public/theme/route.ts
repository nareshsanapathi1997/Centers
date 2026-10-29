import { NextResponse } from 'next/server'
import { loadAppThemeSettings } from '@/lib/app-theme-settings'

export const dynamic = 'force-dynamic'

export const revalidate = 60

export async function GET() {
  try {
    const settings = await loadAppThemeSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching public theme settings:', error)
    return NextResponse.json({ mode: 'light', force: false })
  }
}
