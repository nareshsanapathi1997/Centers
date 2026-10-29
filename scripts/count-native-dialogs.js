/**
 * Inventory of native alert()/confirm() calls in the admin UI, so the migration
 * to the toast/confirm provider can be tracked and verified as complete.
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOTS = ['app', 'components']
const ALERT = /(^|[^.\w$])alert\s*\(/g
const CONFIRM = /(^|[^.\w$])confirm\s*\(/g

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) files.push(full)
  }
  return files
}

const rows = []
let alerts = 0
let confirms = 0

for (const root of ROOTS) {
  for (const file of walk(path.join(__dirname, '..', root))) {
    const src = fs.readFileSync(file, 'utf8')
    const a = (src.match(ALERT) || []).length
    const c = (src.match(CONFIRM) || []).length
    if (a || c) {
      rows.push({ file: path.relative(path.join(__dirname, '..'), file), a, c })
      alerts += a
      confirms += c
    }
  }
}

rows.sort((x, y) => y.a + y.c - (x.a + x.c))
for (const row of rows) {
  console.log(`${String(row.a).padStart(3)} alert  ${String(row.c).padStart(3)} confirm  ${row.file}`)
}
console.log(`\n${rows.length} files, ${alerts} alert() and ${confirms} confirm() calls`)
