/**
 * Repairs the admin-ui-store import that migrate-native-dialogs.js inserted
 * after a line matching /^import .*$/ — which for a multi-line
 * `import {\n  A,\n} from 'x'` statement is the opening line, splitting it.
 *
 * Moves any misplaced import to just after the last complete import statement.
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')
// \r? because the repo mixes LF and CRLF files.
const IMPORT_LINE =
  /^import \{ (?:toast|confirmDialog|toast, confirmDialog|confirmDialog, toast) \} from '@\/lib\/admin-ui-store'\r?\n/m

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name.endsWith('.tsx')) files.push(full)
  }
  return files
}

/** Index just past the final top-level import statement. */
function endOfImports(src) {
  const lines = src.split('\n')
  let lastEnd = 0
  let offset = 0
  let inImport = false

  for (const line of lines) {
    // +1 restores the '\n' that split removed; any '\r' is still in `line`.
    const lineLength = line.length + 1

    if (!inImport && /^import\b/.test(line)) {
      inImport = true
    }

    if (inImport) {
      // A statement ends on the line carrying its `from '...'` (or a bare
      // side-effect import like `import './x.css'`).
      if (/ from ['"].*['"];?\s*$/.test(line) || /^import ['"].*['"];?\s*$/.test(line)) {
        inImport = false
        lastEnd = offset + lineLength
      }
    }

    offset += lineLength
  }

  return lastEnd
}

let fixed = 0

for (const root of ['app', 'components']) {
  for (const file of walk(path.join(ROOT, root))) {
    let src = fs.readFileSync(file, 'utf8')
    const match = src.match(IMPORT_LINE)
    if (!match) continue

    // Reuse the file's own line ending so the diff stays clean.
    const eol = src.includes('\r\n') ? '\r\n' : '\n'
    const statement = `${match[0].trimEnd()}${eol}`
    const withoutImport = src.replace(IMPORT_LINE, '')
    const insertAt = endOfImports(withoutImport)
    const rebuilt =
      withoutImport.slice(0, insertAt) + statement + withoutImport.slice(insertAt)

    if (rebuilt === src) continue

    fs.writeFileSync(file, rebuilt)
    console.log(`fixed  ${path.relative(ROOT, file)}`)
    fixed++
  }
}

console.log(`\n${fixed} file(s) repositioned`)
