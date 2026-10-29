/**
 * Prints resolved Next.js basePath at build time.
 */
const path = require('node:path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const raw = process.env.NEXT_PUBLIC_BASE_PATH
const basePath =
  raw != null && String(raw).trim() !== ''
    ? String(raw).trim().replace(/\/+$/, '')
    : '(site root — no basePath)'

console.log(`[centermanager] NEXT_PUBLIC_BASE_PATH=${basePath}`)
