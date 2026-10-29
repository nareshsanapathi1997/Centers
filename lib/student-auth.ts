import { NextRequest } from 'next/server'
import pool from './db'
import { signJwt, verifyJwt } from './jwt'
import { STUDENT_COOKIE, readToken } from './auth-cookies'
import { isStudentSessionValid } from './student-sessions'

export interface StudentTokenPayload {
  studentId: number
  centerId: number
  jti?: string
}

export function verifyStudentToken(token: string): StudentTokenPayload | null {
  const decoded = verifyJwt<StudentTokenPayload & { type?: string }>(token)
  if (!decoded) return null
  if (decoded.type && decoded.type !== 'student') return null
  return { studentId: decoded.studentId, centerId: decoded.centerId, jti: decoded.jti }
}

export function getStudentToken(request: NextRequest): string | null {
  return readToken(request, STUDENT_COOKIE)
}

export async function verifyStudentAccess(
  token: string,
  centerId: number
): Promise<{ authorized: boolean; studentId?: number; jti?: string; error?: string }> {
  const payload = verifyStudentToken(token)
  if (!payload) {
    return { authorized: false, error: 'Invalid token' }
  }

  if (Number(payload.centerId) !== Number(centerId)) {
    return { authorized: false, error: 'Unauthorized: center mismatch' }
  }

  if (payload.jti) {
    const sessionValid = await isStudentSessionValid(payload.jti)
    if (!sessionValid) {
      return { authorized: false, error: 'Session expired or revoked' }
    }
  }

  try {
    const result = await pool.query(
      'SELECT id, center_id, is_active FROM students WHERE id = $1',
      [payload.studentId]
    )

    if (result.rows.length === 0) {
      return { authorized: false, error: 'Student not found' }
    }

    const student = result.rows[0]
    if (!student.is_active) {
      return { authorized: false, error: 'Account is inactive' }
    }

    if (Number(student.center_id) !== Number(centerId)) {
      return { authorized: false, error: 'Unauthorized: center mismatch' }
    }

    return { authorized: true, studentId: payload.studentId, jti: payload.jti }
  } catch (error) {
    console.error('Error verifying student access:', error)
    return { authorized: false, error: 'Database error' }
  }
}

export function signStudentToken(studentId: number, centerId: number, jti: string): string {
  return signJwt({ studentId, centerId, type: 'student', jti }, '30d')
}

export function getTokenExpiryDate(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d
}
