/**
 * Removes .next so the next dev/build starts from a clean output tree.
 * Use when you see:
 * - Cannot find module './NNNN.js'
 * - GET /_next/static/chunks/main-app.js (404)
 * - Mixed stack traces (e.g. admin/login loading app/page chunks)
 */
const fs = require('fs')
const path = require('path')

const nextDir = path.join(__dirname, '..', '.next')
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true })
  console.log('Removed .next')
} else {
  console.log('No .next folder to remove')
}
