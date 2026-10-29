import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { getStudentToken, verifyStudentAccess } from '@/lib/student-auth'
import { getStudentById } from '@/lib/student-portal-db'
import { validatePassword } from '@/lib/password-policy'
import { createEmailVerificationToken } from '@/lib/student-email-verification'

export const dynamic = 'force-dynamic'

function parseDateOfBirth(
  value: unknown
): { ok: true; provided: false } | { ok: true; provided: true; date: string | null } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, provided: false }
  if (value === null || value === '') return { ok: true, provided: true, date: null }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { ok: false, error: 'Date of birth must be YYYY-MM-DD' }
  }
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: 'Invalid date of birth' }
  }
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (d > today) {
    return { ok: false, error: 'Date of birth cannot be in the future' }
  }
  const min = new Date()
  min.setFullYear(min.getFullYear() - 120)
  if (d < min) {
    return { ok: false, error: 'Date of birth is not realistic' }
  }
  return { ok: true, provided: true, date: value }
}

export async function GET(request: NextRequest) {
  try {
    const centerId = parseInt(request.nextUrl.searchParams.get('centerId') || '', 10)
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 })

    const student = await getStudentById(auth.studentId!, centerId)
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const guardians = await pool.query(
      `SELECT id, full_name, relation, mobile, email, is_primary
       FROM student_guardians WHERE student_id = $1 ORDER BY is_primary DESC, id`,
      [auth.studentId]
    )

    return NextResponse.json({ student, guardians: guardians.rows })
  } catch (error) {
    console.error('Student profile GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const centerId = parseInt(body.centerId, 10)
    if (!centerId) {
      return NextResponse.json({ error: 'centerId is required' }, { status: 400 })
    }

    const token = getStudentToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await verifyStudentAccess(token, centerId)
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: 403 })

    const {
      fullName,
      email,
      fatherName,
      address,
      state,
      city,
      pincode,
      dateOfBirth,
      photoUrl,
      notifyEmail,
      notifyInApp,
      currentPassword,
      newPassword,
      guardians,
    } = body

    const dobParsed = parseDateOfBirth(dateOfBirth)
    if (!dobParsed.ok) {
      return NextResponse.json({ error: dobParsed.error }, { status: 400 })
    }
    const dobValue = dobParsed.provided ? dobParsed.date : null

    const current = await pool.query(
      'SELECT email, email_verified, password_hash FROM students WHERE id = $1 AND center_id = $2',
      [auth.studentId, centerId]
    )
    if (current.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const prevEmailVal = current.rows[0]?.email?.trim().toLowerCase() || null
    const emailVerified = Boolean(current.rows[0]?.email_verified)

    if (newPassword) {
      if (prevEmailVal && !emailVerified) {
        return NextResponse.json(
          { error: 'Please verify your email before changing your password' },
          { status: 403 }
        )
      }
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
      }
      const passwordCheck = validatePassword(newPassword)
      if (!passwordCheck.valid) {
        return NextResponse.json({ error: passwordCheck.error }, { status: 400 })
      }
      const valid = await bcrypt.compare(currentPassword, current.rows[0].password_hash)
      if (!valid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
      const hash = await bcrypt.hash(newPassword, 10)
      await pool.query(
        'UPDATE students SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hash, auth.studentId]
      )
    }

    const newEmailVal = email === undefined ? undefined : email?.trim().toLowerCase() || null
    const resolvedPhotoUrl =
      photoUrl === undefined
        ? undefined
        : typeof photoUrl === 'string' && photoUrl.trim()
          ? photoUrl.trim()
          : null

    if (resolvedPhotoUrl !== undefined && resolvedPhotoUrl !== null) {
      if (!resolvedPhotoUrl.startsWith('/uploads/student-photos/')) {
        return NextResponse.json({ error: 'Invalid photo URL' }, { status: 400 })
      }
    }

    await pool.query(
      `UPDATE students SET
         full_name = COALESCE($1, full_name),
         email = CASE WHEN $2::boolean AND $3 IS NOT NULL THEN $3 ELSE email END,
         father_name = COALESCE($4, father_name),
         address = COALESCE($5, address),
         state = COALESCE($6, state),
         city = COALESCE($7, city),
         pincode = COALESCE($8, pincode),
         date_of_birth = CASE WHEN $9::boolean THEN $10::date ELSE date_of_birth END,
         photo_url = CASE WHEN $11::boolean THEN $12 ELSE photo_url END,
         notify_email = CASE WHEN $13::boolean THEN $14 ELSE notify_email END,
         notify_in_app = CASE WHEN $15::boolean THEN $16 ELSE notify_in_app END,
         email_verified = CASE
           WHEN $2::boolean AND $3 IS NOT NULL AND LOWER($3) <> COALESCE($17, '') THEN false
           ELSE email_verified
         END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $18 AND center_id = $19`,
      [
        fullName?.trim() || null,
        newEmailVal !== undefined,
        newEmailVal ?? null,
        fatherName?.trim() || null,
        address?.trim() || null,
        state?.trim() || null,
        city?.trim() || null,
        pincode?.trim() || null,
        dobParsed.provided,
        dobValue,
        resolvedPhotoUrl !== undefined,
        resolvedPhotoUrl,
        typeof notifyEmail === 'boolean',
        typeof notifyEmail === 'boolean' ? notifyEmail : true,
        typeof notifyInApp === 'boolean',
        typeof notifyInApp === 'boolean' ? notifyInApp : true,
        prevEmailVal || '',
        auth.studentId,
        centerId,
      ]
    )

    if (newEmailVal && newEmailVal !== prevEmailVal) {
      createEmailVerificationToken(auth.studentId!).catch(console.error)
    }

    if (Array.isArray(guardians)) {
      await pool.query('DELETE FROM student_guardians WHERE student_id = $1', [auth.studentId])
      for (const g of guardians.slice(0, 5)) {
        if (!g.fullName?.trim()) continue
        await pool.query(
          `INSERT INTO student_guardians (student_id, center_id, full_name, relation, mobile, email, is_primary)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            auth.studentId,
            centerId,
            g.fullName.trim(),
            g.relation?.trim() || null,
            g.mobile?.trim() || null,
            g.email?.trim().toLowerCase() || null,
            Boolean(g.isPrimary),
          ]
        )
      }
    }

    const student = await getStudentById(auth.studentId!, centerId)
    const guardianRows = await pool.query(
      `SELECT id, full_name, relation, mobile, email, is_primary FROM student_guardians WHERE student_id = $1 ORDER BY is_primary DESC, id`,
      [auth.studentId]
    )
    return NextResponse.json({ student, guardians: guardianRows.rows })
  } catch (error) {
    console.error('Student profile PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
