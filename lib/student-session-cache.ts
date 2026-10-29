export type StudentSessionStudent = {
  fullName: string
  email: string
  emailVerified: boolean
}

type SessionCache = {
  centerId: number
  student: StudentSessionStudent
  ts: number
}

/** Survives layout remounts within the same tab (portal ↔ exam). */
let sessionCache: SessionCache | null = null

export function getStudentSessionCache(centerId: number): SessionCache | null {
  if (!sessionCache || sessionCache.centerId !== centerId) return null
  return sessionCache
}

export function setStudentSessionCache(centerId: number, student: StudentSessionStudent) {
  sessionCache = { centerId, student, ts: Date.now() }
}

export function clearStudentSessionCache() {
  sessionCache = null
}
