import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { listMainCourseCategories } from '@/lib/course-category-master'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const rows = await listMainCourseCategories()
    return NextResponse.json(rows)
  } catch (error: unknown) {
    console.error('[super-admin/course-categories GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
