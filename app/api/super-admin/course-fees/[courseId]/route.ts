import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import { deleteBaseFee, getBaseFeeByCourseId, upsertBaseFee } from '@/lib/course-fees-db'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ courseId: string }> }

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const authResult = await verifySuperAdminAuth(_request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const { courseId } = await context.params
    const fee = await getBaseFeeByCourseId(Number(courseId))
    if (!fee) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(fee)
  } catch (error) {
    console.error('Error fetching base fee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const { courseId } = await context.params
    const body = await request.json()
    const saved = await upsertBaseFee(Number(courseId), body)
    return NextResponse.json(saved)
  } catch (error) {
    console.error('Error updating base fee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const authResult = await verifySuperAdminAuth(_request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const { courseId } = await context.params
    await deleteBaseFee(Number(courseId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting base fee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
