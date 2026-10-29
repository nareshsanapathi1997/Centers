import { NextRequest, NextResponse } from 'next/server'
import { getAdminToken, verifyAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { listMainCourseCategories } from '@/lib/course-category-master'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyAdminToken(token)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, payload.centerId, 'courses', 'read')
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const rows = await listMainCourseCategories()
    return NextResponse.json(rows)
  } catch (error: unknown) {
    console.error('Error fetching master course categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
