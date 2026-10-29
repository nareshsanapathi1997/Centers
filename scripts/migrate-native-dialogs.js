/**
 * Replaces native alert()/confirm() calls in the admin UI with the toast and
 * confirm dialog from `lib/admin-ui-store`.
 *
 * alert() is classified by message wording so a save confirmation reads as a
 * success and a failure reads as an error, rather than flattening everything to
 * one neutral style.
 *
 * confirm() becomes `await confirmDialog(...)`. Whether the enclosing function
 * is already async cannot be decided by a regex, so the await is always emitted
 * and `tsc` is used to find the handlers that still need the `async` keyword.
 *
 * Run with --write to apply; the default is a dry run.
 */
const fs = require('node:fs')
const path = require('node:path')

const WRITE = process.argv.includes('--write')
const ROOT = path.join(__dirname, '..')
const ROOTS = ['app', 'components']

/**
 * Excluded: the toast implementation itself, plus public-site components that
 * render outside the admin layouts where the provider is mounted — a toast
 * there would only reach the console.
 */
const SKIP = new Set([
  path.join('components', 'admin', 'AdminUIProvider.tsx'),
  path.join('components', 'teems', 'CategoryCoursesCompare.tsx'),
  path.join('components', 'vacancies', 'VacanciesWhatsAppModal.tsx'),
])

const SUCCESS = /success|saved|updated|created|deleted|added|removed|sent|uploaded|imported|approved|copied|complete|rejected|revoked|linked/i
const FAILURE = /fail|error|invalid|required|could not|couldn't|cannot|can't|unable|denied|not found|no .* selected|already exists|must be|please (enter|select|provide|fill|choose)|missing|too large|unsupported|wrong|expired|limit/i

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name.endsWith('.tsx')) files.push(full)
  }
  return files
}

/** Reads the balanced argument list starting at the '(' index. */
function readArgs(src, openParen) {
  let depth = 0
  let quote = null
  for (let i = openParen; i < src.length; i++) {
    const ch = src[i]
    const prev = src[i - 1]

    if (quote) {
      if (ch === quote && prev !== '\\') quote = null
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      continue
    }
    if (ch === '(') depth++
    else if (ch === ')') {
      depth--
      if (depth === 0) return { args: src.slice(openParen + 1, i), end: i }
    }
  }
  return null
}

function classify(args) {
  if (FAILURE.test(args)) return 'error'
  if (SUCCESS.test(args)) return 'success'
  return 'info'
}

/** Matches a call that is not a property access (so `foo.alert(` is skipped). */
function findCalls(src, name) {
  const hits = []
  const re = new RegExp(`(^|[^.\\w$])(?:window\\.)?${name}\\s*\\(`, 'g')
  let match
  while ((match = re.exec(src)) !== null) {
    const openParen = src.indexOf('(', match.index + match[1].length)
    hits.push({ start: match.index + match[1].length, openParen })
  }
  return hits
}

const summary = { files: 0, alerts: 0, confirms: 0, manual: [] }

for (const root of ROOTS) {
  for (const file of walk(path.join(ROOT, root))) {
    const rel = path.relative(ROOT, file)
    if (SKIP.has(rel)) continue

    let src = fs.readFileSync(file, 'utf8')
    const original = src

    // alert() → toast.<variant>()
    for (;;) {
      const hit = findCalls(src, 'alert')[0]
      if (!hit) break
      const parsed = readArgs(src, hit.openParen)
      if (!parsed) break
      const variant = classify(parsed.args)
      src = `${src.slice(0, hit.start)}toast.${variant}(${parsed.args})${src.slice(parsed.end + 1)}`
      summary.alerts++
    }

    // confirm() → await confirmDialog()
    for (;;) {
      const hit = findCalls(src, 'confirm').find(
        (h) => !src.slice(h.start).startsWith('confirmDialog')
      )
      if (!hit) break
      const parsed = readArgs(src, hit.openParen)
      if (!parsed) break

      const destructive = /delete|remove|revoke|cancel|discard|clear|refund/i.test(parsed.args)
      const options = destructive
        ? `{ message: ${parsed.args.trim()}, destructive: true }`
        : parsed.args.trim()

      src = `${src.slice(0, hit.start)}(await confirmDialog(${options}))${src.slice(parsed.end + 1)}`
      summary.confirms++
    }

    if (src === original) continue

    // Add the import next to the last existing import.
    const needs = []
    if (/\btoast\.(success|error|info|warning)\(/.test(src) && !/from '@\/lib\/admin-ui-store'/.test(src)) {
      needs.push('toast')
    }
    if (/\bconfirmDialog\(/.test(src) && !/from '@\/lib\/admin-ui-store'/.test(src)) {
      needs.push('confirmDialog')
    }

    if (needs.length) {
      const importRe = /^import .*$/gm
      let last = null
      let m
      while ((m = importRe.exec(src)) !== null) last = m
      const statement = `\nimport { ${needs.join(', ')} } from '@/lib/admin-ui-store'`
      if (last) {
        src = src.slice(0, last.index + last[0].length) + statement + src.slice(last.index + last[0].length)
      } else {
        src = `${statement.trim()}\n${src}`
      }
    }

    summary.files++
    if (WRITE) fs.writeFileSync(file, src)
    console.log(`${WRITE ? 'wrote' : 'would write'}  ${rel}`)
  }
}

console.log(
  `\n${summary.files} files, ${summary.alerts} alert() and ${summary.confirms} confirm() calls converted`
)
if (summary.manual.length) {
  console.log(`\n${summary.manual.length} confirm() call(s) in non-async functions — handle manually:`)
  for (const item of summary.manual) console.log(`  ${item}`)
}
