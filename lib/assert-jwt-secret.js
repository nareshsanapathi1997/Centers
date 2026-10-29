/**
 * Used by server.js (Node cannot require .ts directly).
 *
 * Deliberately NOT named `jwt-secret.js`: that would sit alongside
 * `lib/jwt-secret.ts` and webpack resolved the `.js` file first when bundling
 * middleware for the Edge runtime, hiding the TypeScript exports.
 */
function assertJwtSecretOnStartup() {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET?.trim()) {
    console.error('FATAL: JWT_SECRET environment variable is required in production.')
    process.exit(1)
  }
}

module.exports = { assertJwtSecretOnStartup }
