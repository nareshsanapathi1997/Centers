import { NextRequest, NextResponse } from 'next/server'
import { getCTASliders } from '@/lib/api'

export const dynamic = 'force-dynamic'

// Mark this route as dynamic since it uses searchParams

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const centerId = parseInt(searchParams.get('centerId') || '0')

    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const sliders = await getCTASliders(centerId)
    return NextResponse.json(sliders)
  } catch (error) {
    console.error('Error fetching CTA sliders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

