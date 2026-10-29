/**
 * Wires the error state added to AdminPageShell / SuperAdminPageShell into the
 * pages that render them.
 *
 * `useAdminFetch` already returned an `error`, but no caller destructured it, so
 * a failed load rendered an empty page. This pulls `error` out of the primary
 * fetch (the one whose `loading` the shell consumes) and passes it, plus a retry
 * that force-refetches.
 *
 * Deliberately conservative: a file is skipped unless the primary destructuring
 * matches exactly, and files that already reference an `error` binding are left
 * alone so hand-written handling is not clobbered.
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname, '..')
const WRITE = process.argv.includes('--write')

const TARGETS = [
  path.join(ROOT, 'app', 'admin'),
  path.join(ROOT, 'app', 'super-admin'),
  path.join(ROOT, 'components', 'admin'),
]

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name.endsWith('.tsx')) files.push(full)
  }
  return files
}

// The primary fetch: destructures `loading`, and aliases refetch to a named fn.
const PRIMARY = /const \{ data: (\w+), loading, refetch: (\w+) \} = useAdminFetch</
const SHELL = /<(AdminPageShell|SuperAdminPageShell) loading=\{loading\}([^>]*)>/

let changed = 0
let skipped = 0

for (const target of TARGETS) {
  for (const file of walk(target)) {
    const rel = path.relative(ROOT, file)
    let src = fs.readFileSync(file, 'utf8')

    const shellMatch = src.match(SHELL)
    if (!shellMatch) continue

    if (shellMatch[2].includes('error=')) continue // already wired

    const primaryMatch = src.match(PRIMARY)
    if (!primaryMatch) {
      console.log(`  skip ${rel}: no primary useAdminFetch with loading + refetch`)
      skipped++
      continue
    }

    // A local `error` would shadow or collide with the new binding.
    if (/\berror\b\s*[,}]/.test(primaryMatch[0]) || /const \[error/.test(src)) {
      console.log(`  skip ${rel}: already has an error binding`)
      skipped++
      continue
    }

    const refetch = primaryMatch[2]

    src = src.replace(
      PRIMARY,
      `const { data: ${primaryMatch[1]}, loading, error, refetch: ${refetch} } = useAdminFetch<`,
    )
    src = src.replace(
      SHELL,
      `<$1 loading={loading} error={error} onRetry={() => void ${refetch}(true)}$2>`,
    )

    if (WRITE) fs.writeFileSync(file, src)
    console.log(`${WRITE ? 'wrote' : 'would write'} ${rel}`)
    changed++
  }
}

console.log(`\n${changed} file(s) wired, ${skipped} skipped`)
