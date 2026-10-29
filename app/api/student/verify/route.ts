import { NextRequest, NextResponse } from 'next/server'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import { getStudentById } from '@/lib/student-portal-db'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { centerId } = await request.json()

    if (!centerId) {
      return NextResponse.json({ authorized: false, error: 'centerId is required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) {
      return NextResponse.json({ authorized: false, error: 'No token provided' }, { status: 401 })
    }

    const result = await verifyStudentAccess(token, parseInt(centerId, 10))
    if (!result.authorized) {
      return NextResponse.json(
        { authorized: false, error: result.error || 'Unauthorized' },
        { status: 403 }
      )
    }

    const student = await getStudentById(result.studentId!, parseInt(centerId, 10))
    if (!student) {
      return NextResponse.json({ authorized: false, error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({
      authorized: true,
      student: {
        id: student.id,
        fullName: student.full_name,
        email: student.email,
        mobile: student.mobile,
        regno: student.regno,
        emailVerified: Boolean(student.email_verified),
        photoUrl: student.photo_url || null,
      },
    })
  } catch (error) {
    console.error('Student verify error:', error)
    return NextResponse.json({ authorized: false, error: 'Internal server error' }, { status: 500 })
  }
}
