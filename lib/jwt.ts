import jwt, { type SignOptions } from 'jsonwebtoken'
import { JWT_ALGORITHM, getJwtSecret } from './jwt-secret'

/**
 * Node-runtime signing and verification. Every caller must go through these so
 * signing and verification can never drift onto different secrets or
 * algorithms. Edge code (middleware) uses `lib/jwt-edge.ts` instead.
 */
export function signJwt(payload: object, expiresIn: SignOptions['expiresIn']): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn, algorithm: JWT_ALGORITHM })
}

/** Verify a token, returning null instead of throwing. */
export function verifyJwt<T>(token: string): T | null {
  try {
    return jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM] }) as T
  } catch {
    return null
  }
}
