import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { buildCourseMasterTree } from '@/lib/course-masters'
import {
  createCourseMaster,
  listCourseMasters,
} from '@/lib/course-masters-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const format = request.nextUrl.searchParams.get('format')
    const rows = await listCourseMasters()

    if (format === 'tree') {
      return NextResponse.json(buildCourseMasterTree(rows))
    }

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching course masters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const created = await createCourseMaster(body)
    return NextResponse.json(created, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error creating course master:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
