/**
 * Secret and algorithm only — deliberately free of any `jsonwebtoken` import
 * so this module can also be loaded from Edge runtime code (middleware).
 * Signing and verification live in `lib/jwt.ts`.
 */

/** The only algorithm this app issues or accepts. Pinning it blocks alg-confusion attacks. */
export const JWT_ALGORITHM = 'HS256' as const

/** Central JWT secret — fails hard in production when unset. */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim()
  if (secret) return secret

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production')
  }

  return 'dev-only-insecure-secret'
}

export function assertJwtSecretOnStartup(): void {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET?.trim()) {
    console.error('FATAL: JWT_SECRET environment variable is required in production.')
    process.exit(1)
  }
}
