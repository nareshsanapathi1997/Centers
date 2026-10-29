import { NextRequest, NextResponse } from 'next/server'
import { getVacancies } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '0')
  if (!centerId) return NextResponse.json({ error: 'centerId required' }, { status: 400 })
  const list = await getVacancies(centerId)
  return NextResponse.json(list)
}
