/**
 * Wrap internal `window.location.href = '/admin|super-admin...'` with `withBasePath(...)`.
 * Run: node scripts/patch-window-location-basepath.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SKIP = new Set(['node_modules', '.next'])
const EXT = new Set(['.tsx', '.ts', '.jsx', '.js'])
const IMPORT = "import { withBasePath } from '@/lib/with-base-path'"

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(ent.name)) continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (EXT.has(path.extname(ent.name))) out.push(p)
  }
  return out
}

function processFile(file) {
  let s = fs.readFileSync(file, 'utf8')
  if (!/window\.location\.href = '\/(?:admin|super-admin)/.test(s)) return false
  if (/window\.location\.href = withBasePath/.test(s)) return false

  const orig = s
  s = s.replace(
    /window\.location\.href = '(\/(?:admin|super-admin)[^']*)'/g,
    "window.location.href = withBasePath('$1')"
  )
  if (s === orig) return false

  if (!s.includes("from '@/lib/with-base-path'")) {
    if (s.startsWith("'use client'")) {
      const nl = s.indexOf('\n')
      s = s.slice(0, nl + 1) + IMPORT + '\n' + s.slice(nl + 1)
    } else if (s.startsWith('"use client"')) {
      const nl = s.indexOf('\n')
      s = s.slice(0, nl + 1) + IMPORT + '\n' + s.slice(nl + 1)
    } else {
      s = IMPORT + '\n' + s
    }
  }

  fs.writeFileSync(file, s)
  return true
}

let n = 0
for (const f of walk(root)) {
  if (f.replace(/\\/g, '/').endsWith('/lib/with-base-path.ts')) continue
  if (processFile(f)) {
    console.log('patched', path.relative(root, f))
    n++
  }
}
console.log('done', n)
