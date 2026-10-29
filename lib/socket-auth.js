/**
 * Handshake authentication for Socket.IO (CommonJS: required by server.js).
 *
 * Mirrors the cookie/bearer contract in `lib/auth-cookies.ts` so a browser that
 * is already signed in needs no extra client wiring.
 */
const jwt = require('jsonwebtoken')

const ADMIN_COOKIE = 'cm_admin_token'
const SUPER_ADMIN_COOKIE = 'cm_super_admin_token'
const STUDENT_COOKIE = 'cm_student_token'

function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    if (key) out[key] = decodeURIComponent(part.slice(idx + 1).trim())
  }
  return out
}

function verify(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET?.trim() || 'dev-only-insecure-secret', {
      algorithms: ['HS256'],
    })
  } catch {
    return null
  }
}

/**
 * Resolves the identity behind a handshake, or null if it cannot be verified.
 * Returns { userType, userId, centerId } matching the notification payload shape.
 */
function identifySocket(handshake) {
  const cookies = parseCookies(handshake.headers?.cookie)
  const bearer = handshake.auth?.token || null

  const candidates = [
    { token: cookies[SUPER_ADMIN_COOKIE], userType: 'super_admin' },
    { token: cookies[ADMIN_COOKIE], userType: 'admin' },
    { token: cookies[STUDENT_COOKIE], userType: 'student' },
    // A bearer token's type is inferred from its claims rather than assumed.
    { token: bearer, userType: null },
  ]

  for (const candidate of candidates) {
    if (!candidate.token) continue
    const payload = verify(candidate.token)
    if (!payload) continue

    if (candidate.userType === 'super_admin') {
      if (!payload.isSuperAdmin) continue
      return { userType: 'super_admin', userId: payload.adminId, centerId: null }
    }
    if (candidate.userType === 'admin') {
      if (payload.isSuperAdmin || !payload.adminId) continue
      return { userType: 'admin', userId: payload.adminId, centerId: payload.centerId ?? null }
    }
    if (candidate.userType === 'student') {
      if (!payload.studentId) continue
      return { userType: 'student', userId: payload.studentId, centerId: payload.centerId ?? null }
    }

    if (payload.isSuperAdmin && payload.adminId) {
      return { userType: 'super_admin', userId: payload.adminId, centerId: null }
    }
    if (payload.studentId) {
      return { userType: 'student', userId: payload.studentId, centerId: payload.centerId ?? null }
    }
    if (payload.adminId) {
      return { userType: 'admin', userId: payload.adminId, centerId: payload.centerId ?? null }
    }
  }

  return null
}

module.exports = { identifySocket, ADMIN_COOKIE, SUPER_ADMIN_COOKIE, STUDENT_COOKIE }
