/**
 * Fails the build if Next.js output basePath does not match NEXT_PUBLIC_BASE_PATH in .env.
 */
const fs = require('node:fs')
const path = require('node:path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const manifestPath = path.join(__dirname, '..', '.next', 'routes-manifest.json')
const expectedRaw = process.env.NEXT_PUBLIC_BASE_PATH
const expected =
  expectedRaw != null && String(expectedRaw).trim() !== ''
    ? String(expectedRaw).trim().replace(/\/+$/, '')
    : ''

let manifest
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
} catch {
  console.error('[centermanager] verify-build: missing .next/routes-manifest.json — run next build first')
  process.exit(1)
}

const built = (manifest.basePath || '').replace(/\/+$/, '')

if (built !== expected) {
  console.error(
    `[centermanager] verify-build FAILED: built basePath="${built || '(root)'}" but .env NEXT_PUBLIC_BASE_PATH="${expected || '(root)'}"`,
  )
  console.error('[centermanager] Fix .env, delete .next, run npm run build again, then restart.')
  process.exit(1)
}

console.log(`[centermanager] verify-build OK: basePath=${built || '(site root)'}`)
