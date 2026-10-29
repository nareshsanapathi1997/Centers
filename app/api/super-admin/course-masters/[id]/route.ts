import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import {
  deleteCourseMaster,
  getCourseMasterById,
  updateCourseMaster,
} from '@/lib/course-masters-db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const id = parseInt(params.id, 10)
    const item = await getCourseMasterById(id)
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(item)
  } catch (error) {
    console.error('Error fetching course master:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const id = parseInt(params.id, 10)
    const body = await request.json()
    const updated = await updateCourseMaster(id, body)
    return NextResponse.json(updated)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error updating course master:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const id = parseInt(params.id, 10)
    const deleted = await deleteCourseMaster(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('Error deleting course master:', error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
