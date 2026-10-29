/**
 * Mobile smoke checks at 375px — overflow + key CTA visibility.
 * Run: node scripts/mobile-smoke.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.SMOKE_BASE || 'http://localhost:2500'
const WIDTH = 375
const HEIGHT = 812

async function docOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement
    const body = document.body
    const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth)
    const clientWidth = doc.clientWidth
    return {
      overflowX: scrollWidth - clientWidth,
      siteHeaderH: getComputedStyle(doc).getPropertyValue('--site-header-h').trim(),
    }
  })
}

async function check(page, path, asserts = {}) {
  const url = `${BASE}${path}`
  let res
  try {
    res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  } catch (e) {
    // Follow client redirects once (student auth, etc.)
    await page.waitForTimeout(1200)
    res = null
    if (!String(e.message || e).includes('interrupted')) throw e
  }
  await page.waitForTimeout(1000)
  const status = res?.status() ?? (page.url().includes(path.split('?')[0]) ? 200 : 0)
  let metrics = { overflowX: 0, siteHeaderH: '' }
  try {
    metrics = await docOverflow(page)
  } catch {
    await page.waitForTimeout(500)
    metrics = await docOverflow(page).catch(() => ({ overflowX: 0, siteHeaderH: '' }))
  }
  const { overflowX, siteHeaderH } = metrics
  const result = { path, status, overflowX, siteHeaderH, finalUrl: page.url(), ok: true, notes: [] }

  if (status >= 400) {
    result.ok = false
    result.notes.push(`HTTP ${status}`)
  }
  if (overflowX > 8) {
    result.ok = false
    result.notes.push(`horizontal overflow ${overflowX}px`)
  }

  if (asserts.selectorVisible) {
    for (const sel of asserts.selectorVisible) {
      const el = page.locator(sel).first()
      const count = await el.count()
      if (!count) {
        result.ok = false
        result.notes.push(`missing ${sel}`)
        continue
      }
      const visible = await el.isVisible().catch(() => false)
      if (!visible) {
        result.ok = false
        result.notes.push(`hidden ${sel}`)
      }
    }
  }

  if (asserts.selectorExists) {
    for (const sel of asserts.selectorExists) {
      const count = await page.locator(sel).count()
      if (!count) {
        result.ok = false
        result.notes.push(`missing ${sel}`)
      }
    }
  }

  return result
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  })
  const page = await context.newPage()

  // Discover a center slug from /centers listing
  let centerSlug = process.env.SMOKE_CENTER || ''
  if (!centerSlug) {
    try {
      await page.goto(`${BASE}/centers`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForTimeout(500)
      centerSlug = await page.evaluate(() => {
        const reserved = new Set([
          'centers',
          'courses',
          'about',
          'contact',
          'news',
          'blog',
          'results',
          'vacancies',
          'student',
          'admin',
          'super-admin',
          'api',
        ])
        const links = [...document.querySelectorAll('a[href]')]
          .map((el) => el.getAttribute('href') || '')
          .map((h) => h.split('?')[0].replace(/\/$/, ''))
          .filter((h) => /^\/[a-z0-9-]+$/i.test(h))
          .map((h) => h.slice(1))
          .filter((slug) => slug && !reserved.has(slug.toLowerCase()))
        return links[0] || ''
      })
    } catch {
      centerSlug = ''
    }
  }

  const paths = [
    { path: '/', asserts: {} },
    { path: '/courses', asserts: {} },
    { path: '/contact', asserts: {} },
    { path: '/news', asserts: {} },
    { path: '/about', asserts: {} },
    { path: '/admin/login', asserts: { selectorExists: ['form', 'input'] } },
    { path: '/super-admin/login', asserts: { selectorExists: ['form', 'input'] } },
  ]

  if (centerSlug) {
    paths.push(
      {
        path: `/${centerSlug}`,
        asserts: {
          // Portal CTA must remain visible on mobile (WhatsApp is optional per center).
          selectorVisible: ['.header-mobile-actions', '.navbar-toggler'],
        },
      },
      { path: `/${centerSlug}/courses`, asserts: {} },
      { path: `/${centerSlug}/contact`, asserts: {} },
      { path: `/${centerSlug}/student/login`, asserts: { selectorExists: ['.sp-auth', 'input'] } },
      { path: `/${centerSlug}/student/register`, asserts: { selectorExists: ['.sp-auth'] } },
    )
  }

  const results = []
  for (const item of paths) {
    try {
      results.push(await check(page, item.path, item.asserts))
    } catch (e) {
      results.push({ path: item.path, ok: false, notes: [String(e.message || e)], status: 0, overflowX: -1 })
    }
  }

  // Soften WhatsApp assert if center has no WhatsApp configured
  for (const r of results) {
    if (r.notes?.some((n) => n.includes('whatsapp') || n.includes('WhatsApp') || n.includes('wa.me'))) {
      const hasPortal = await page.goto(`${BASE}${r.path}`, { waitUntil: 'domcontentloaded' }).then(() =>
        page.locator('.header-mobile-actions a, .header-mobile-actions button').count()
      )
      if (hasPortal > 0) {
        r.notes = r.notes.filter((n) => !/whatsapp|WhatsApp|wa\.me/i.test(n))
        // Prefer Student Portal visibility as the CTA check
        const portalVisible = await page
          .locator('.header-mobile-actions a, .header-mobile-actions .btn')
          .first()
          .isVisible()
          .catch(() => false)
        if (portalVisible) r.ok = r.notes.length === 0
      }
    }
  }

  await browser.close()

  const failed = results.filter((r) => !r.ok)
  console.log(JSON.stringify({ centerSlug, viewport: `${WIDTH}x${HEIGHT}`, results, failed: failed.length }, null, 2))
  if (failed.length) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
