import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { getAdminToken } from '@/lib/auth'
import { requireAdminPermission, httpMethodToAction } from '@/lib/admin-access'
import { generateStudentRegno, linkPaymentsToStudent } from '@/lib/student-portal-db'
import { validatePassword } from '@/lib/password-policy'
import { revokeAllStudentSessions } from '@/lib/student-sessions'

export const dynamic = 'force-dynamic'

function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

export async function GET(request: NextRequest) {
  try {
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    const search = request.nextUrl.searchParams.get('search')?.trim() || ''

    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'students', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const params: unknown[] = [centerId]
    let where = 'WHERE s.center_id = $1'
    if (search) {
      params.push(`%${search}%`)
      where += ` AND (s.full_name ILIKE $2 OR s.mobile ILIKE $2 OR s.email ILIKE $2 OR s.regno ILIKE $2)`
    }

    const result = await pool.query(
      `SELECT s.id, s.regno, s.full_name, s.email, s.mobile, s.is_active, s.last_login_at, s.created_at,
              COUNT(sfp.id)::int AS payment_count
       FROM students s
       LEFT JOIN student_fee_payments sfp ON sfp.student_id = s.id
       ${where}
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT 200`,
      params
    )

    return NextResponse.json({ students: result.rows })
  } catch (error) {
    console.error('Admin students GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const centerId = parseInt(body.centerId, 10)

    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'students', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    const { fullName, email, mobile, password, fatherName } = body
    if (!fullName?.trim() || !mobile?.trim() || !password) {
      return NextResponse.json({ error: 'Full name, mobile, and password are required' }, { status: 400 })
    }

    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 })
    }

    const normalizedMobile = normalizeMobile(mobile)
    const normalizedEmail = email?.trim().toLowerCase() || null

    const existing = await pool.query(
      `SELECT id FROM students WHERE center_id = $1 AND (mobile = $2 OR ($3 IS NOT NULL AND LOWER(email) = $3))`,
      [centerId, normalizedMobile, normalizedEmail]
    )
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Student with this mobile or email already exists' }, { status: 409 })
    }

    const regno = await generateStudentRegno(centerId)
    const passwordHash = await bcrypt.hash(password, 10)

    const insertResult = await pool.query(
      `INSERT INTO students (center_id, regno, full_name, email, mobile, password_hash, father_name, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id, regno, full_name, email, mobile, is_active, created_at`,
      [centerId, regno, fullName.trim(), normalizedEmail, normalizedMobile, passwordHash, fatherName?.trim() || null]
    )

    const student = insertResult.rows[0]
    await linkPaymentsToStudent(student.id, centerId, normalizedMobile)

    return NextResponse.json({ student })
  } catch (error) {
    console.error('Admin students POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const centerId = parseInt(body.centerId, 10)
    const studentId = parseInt(body.studentId, 10)

    if (!centerId || !studentId) {
      return NextResponse.json({ error: 'centerId and studentId are required' }, { status: 400 })
    }

    const token = getAdminToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const perm = await requireAdminPermission(token, centerId, 'students', httpMethodToAction(request.method))
    if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status })

    if (body.newPassword) {
      const passwordCheck = validatePassword(body.newPassword)
      if (!passwordCheck.valid) {
        return NextResponse.json({ error: passwordCheck.error }, { status: 400 })
      }
      const hash = await bcrypt.hash(body.newPassword, 10)
      await pool.query('UPDATE students SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND center_id = $3', [
        hash,
        studentId,
        centerId,
      ])
      await revokeAllStudentSessions(studentId)
    }

    if (typeof body.isActive === 'boolean') {
      await pool.query('UPDATE students SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND center_id = $3', [
        body.isActive,
        studentId,
        centerId,
      ])
    }

    if (body.fullName || body.email || body.fatherName) {
      await pool.query(
        `UPDATE students SET
           full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           father_name = COALESCE($3, father_name),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND center_id = $5`,
        [body.fullName?.trim() || null, body.email?.trim().toLowerCase() || null, body.fatherName?.trim() || null, studentId, centerId]
      )
    }

    const result = await pool.query(
      'SELECT id, regno, full_name, email, mobile, is_active, last_login_at, created_at FROM students WHERE id = $1 AND center_id = $2',
      [studentId, centerId]
    )

    return NextResponse.json({ student: result.rows[0] })
  } catch (error) {
    console.error('Admin students PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
