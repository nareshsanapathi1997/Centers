/**
 * One-shot codemod: wrap same-origin `/api/...` fetch URL args with `withBasePath(...)`.
 * Run: node scripts/patch-api-fetch-basepath.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const SKIP = new Set(['node_modules', '.next'])
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx'])

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

function endOfTemplateLiteral(s, openBacktick) {
  let i = openBacktick + 1
  while (i < s.length) {
    const c = s[i]
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === '`') return i + 1
    if (c === '$' && s[i + 1] === '{') {
      i += 2
      let depth = 1
      while (i < s.length && depth > 0) {
        if (s[i] === '{') depth++
        else if (s[i] === '}') depth--
        i++
      }
      continue
    }
    i++
  }
  return s.length
}

function literalEnd(s, openIdx) {
  const q = s[openIdx]
  if (q === '`') return endOfTemplateLiteral(s, openIdx)
  let k = openIdx + 1
  while (k < s.length && s[k] !== q) {
    if (s[k] === '\\') k += 2
    else k++
  }
  return k < s.length ? k + 1 : s.length
}

function processFile(file) {
  let s = fs.readFileSync(file, 'utf8')
  if (!/\bfetch\s*\(\s*['"`]\/api/.test(s) && !/\bawait\s+fetch\s*\(\s*['"`]\/api/.test(s)) return false

  const orig = s
  let guard = 0
  while (guard++ < 8000) {
    const re = /\b(await\s+)?fetch\s*\(\s*(['"`])\/api/g
    const m = re.exec(s)
    if (!m) break

    const fetchCall = m[0].includes('await') ? 'await fetch(' : 'fetch('
    const callStart = s.lastIndexOf(fetchCall, m.index + m[0].length)
    const parenIdx = callStart + fetchCall.length - 1
    let j = parenIdx + 1
    while (j < s.length && /\s/.test(s[j])) j++
    const openQuoteIdx = j
    const literal = s.slice(openQuoteIdx, literalEnd(s, openQuoteIdx))
    if (!/^['"`]\/api/.test(literal)) break

    const before = s.slice(0, openQuoteIdx)
    const after = s.slice(openQuoteIdx + literal.length)
    s = before + `withBasePath(${literal})` + after
  }

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

const files = walk(root)
let n = 0
for (const f of files) {
  if (f.replace(/\\/g, '/').endsWith('/lib/with-base-path.ts')) continue
  try {
    if (processFile(f)) {
      console.log('patched', path.relative(root, f))
      n++
    }
  } catch (e) {
    console.error('fail', f, e)
  }
}
console.log('done, files:', n)
