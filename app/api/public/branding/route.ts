import { NextResponse } from 'next/server'
import { getPublicChromeSettings, globalSettingValue } from '@/lib/api'
import { getDefaultImageUrl } from '@/lib/image-utils'

export const dynamic = 'force-dynamic'

export const revalidate = 300

export async function GET() {
  try {
    const settings = await getPublicChromeSettings()

    return NextResponse.json({
      logoLight: getDefaultImageUrl(
        globalSettingValue(settings, 'global_logo_light'),
        '/assets/img/logo.png'
      ),
      logoDark: getDefaultImageUrl(
        globalSettingValue(settings, 'global_logo_dark'),
        '/assets/img/logo-white.png'
      ),
    })
  } catch (error) {
    console.error('Error fetching public branding:', error)
    return NextResponse.json({
      logoLight: getDefaultImageUrl(null, '/assets/img/logo.png'),
      logoDark: getDefaultImageUrl(null, '/assets/img/logo-white.png'),
    })
  }
}
