import { NextRequest, NextResponse } from 'next/server'
import { verifySuperAdminAuth } from '@/lib/super-admin-auth'
import {
  deleteBaseFee,
  listAllFeeCatalogCourses,
  listAllMainCoursesForFees,
  listBaseFees,
  listLeafCoursesWithoutBaseFee,
  upsertBatchBaseFee,
  upsertBaseFee,
} from '@/lib/course-fees-db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const catalog = request.nextUrl.searchParams.get('catalog') === '1'
    if (catalog) {
      const [mainCourses, courses] = await Promise.all([
        listAllMainCoursesForFees(),
        listAllFeeCatalogCourses(),
      ])
      return NextResponse.json({ mainCourses, courses })
    }

    const mainCourseId = request.nextUrl.searchParams.get('mainCourseId')
    const mainCourseFilter = mainCourseId ? Number(mainCourseId) : undefined

    const unassigned = request.nextUrl.searchParams.get('unassigned') === '1'
    if (unassigned) {
      const courses = await listLeafCoursesWithoutBaseFee(
        mainCourseFilter && Number.isFinite(mainCourseFilter) ? mainCourseFilter : undefined
      )
      return NextResponse.json(courses)
    }

    const fees = await listBaseFees()
    const catalogItems = await listAllFeeCatalogCourses()
    const catalogById = new Map(catalogItems.map((c) => [c.course_master_id, c]))
    let enriched = fees.map((f) => {
      const meta = catalogById.get(f.course_master_id)
      return {
        ...f,
        main_course_id: meta?.main_course_id,
        main_course_title: meta?.main_course_title,
        category_path: meta?.category_path,
      }
    })
    if (mainCourseFilter && Number.isFinite(mainCourseFilter)) {
      enriched = enriched.filter((f) => f.main_course_id === mainCourseFilter)
    }
    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Error fetching base fees:', error)
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
    const courseMasterId = Number(body.course_master_id)
    if (!courseMasterId) {
      return NextResponse.json({ error: 'course_master_id is required' }, { status: 400 })
    }

    const batchId = body.batch_id ? Number(body.batch_id) : null
    if (batchId) {
      const saved = await upsertBatchBaseFee(batchId, courseMasterId, body)
      return NextResponse.json(saved, { status: 201 })
    }

    const saved = await upsertBaseFee(courseMasterId, body)
    return NextResponse.json(saved, { status: 201 })
  } catch (error) {
    console.error('Error saving base fee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifySuperAdminAuth(request)
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error || 'Unauthorized' }, { status: 403 })
    }

    const courseMasterId = Number(request.nextUrl.searchParams.get('courseMasterId'))
    if (!courseMasterId) {
      return NextResponse.json({ error: 'courseMasterId is required' }, { status: 400 })
    }

    await deleteBaseFee(courseMasterId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting base fee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
