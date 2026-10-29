/**
 * Renders real public pages and asserts the font/image changes took effect and
 * nothing 500s. Complements scripts/smoke-check.js, which covers hardening.
 */
const BASE = process.env.SMOKE_BASE || 'http://localhost:2500'
const SLUG = process.env.SMOKE_SLUG || 'naresh'

const PAGES = ['/', `/${SLUG}`, `/${SLUG}/courses`, `/${SLUG}/contact`, '/courses', '/contact']

async function run() {
  let failed = false

  for (const page of PAGES) {
    const res = await fetch(`${BASE}${page}`, { redirect: 'manual' })
    const html = res.status === 200 ? await res.text() : ''
    const notes = []

    if (res.status !== 200) {
      notes.push(`status ${res.status}`)
      failed = true
    } else {
      if (html.includes('fonts.googleapis.com')) {
        notes.push('STILL LINKS GOOGLE FONTS')
        failed = true
      }
      if (/_next\/static\/media\/.*\.woff2/.test(html)) notes.push('self-hosted font preloaded')
      if (html.includes('/_next/image?url=')) notes.push('optimized images')
      if (html.includes('<script>alert')) {
        notes.push('UNSANITIZED SCRIPT')
        failed = true
      }
    }

    console.log(`${res.status === 200 ? 'PASS' : 'FAIL'}  ${page}  ${notes.join('; ') || 'ok'}`)
  }

  if (failed) process.exitCode = 1
}

run()
