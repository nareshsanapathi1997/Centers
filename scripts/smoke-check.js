/**
 * Ad-hoc verification of the hardening and performance changes against a
 * running dev server. Not a test suite — a quick end-to-end sanity pass.
 */
const BASE = process.env.SMOKE_BASE || 'http://localhost:2500'

async function check(label, fn) {
  try {
    const detail = await fn()
    console.log(`PASS  ${label}${detail ? ` — ${detail}` : ''}`)
  } catch (error) {
    console.log(`FAIL  ${label} — ${error.message}`)
    process.exitCode = 1
  }
}

async function run() {
  await check('security headers on homepage', async () => {
    const res = await fetch(BASE, { redirect: 'manual' })
    const wanted = ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy']
    const missing = wanted.filter((h) => !res.headers.get(h))
    if (missing.length) throw new Error(`missing ${missing.join(', ')} (status ${res.status})`)
    return `status ${res.status}`
  })

  await check('gzip compression', async () => {
    const res = await fetch(BASE, { headers: { 'Accept-Encoding': 'gzip' } })
    const encoding = res.headers.get('content-encoding')
    if (!encoding) throw new Error('no content-encoding header')
    return encoding
  })

  await check('admin area redirects when unauthenticated', async () => {
    const res = await fetch(`${BASE}/admin/1/dashboard`, { redirect: 'manual' })
    if (res.status !== 307 && res.status !== 302) throw new Error(`status ${res.status}`)
    return `${res.status} → ${res.headers.get('location')}`
  })

  await check('unauthenticated super-admin settings API is rejected', async () => {
    const res = await fetch(`${BASE}/api/super-admin/global-settings`)
    if (res.status !== 401 && res.status !== 403) throw new Error(`status ${res.status}`)
    return `status ${res.status}`
  })

  await check('unauthenticated header-menu API is rejected', async () => {
    const res = await fetch(`${BASE}/api/super-admin/header-menu`)
    if (res.status !== 401 && res.status !== 403) throw new Error(`status ${res.status}`)
    return `status ${res.status}`
  })

  await check('test-db diagnostics hidden', async () => {
    const res = await fetch(`${BASE}/api/test-db`)
    if (res.status === 200) throw new Error('still public')
    return `status ${res.status}`
  })

  await check('course materials not publicly downloadable', async () => {
    const res = await fetch(`${BASE}/uploads/materials/center_1/anything.pdf`)
    if (res.status !== 404) throw new Error(`status ${res.status}`)
    return 'blocked (404)'
  })

  await check('material download requires auth', async () => {
    const res = await fetch(`${BASE}/api/student/materials/download?centerId=1&materialId=1`)
    if (res.status !== 401 && res.status !== 403) throw new Error(`status ${res.status}`)
    return `status ${res.status}`
  })

  await check('login rate limit engages', async () => {
    let limited = 0
    for (let i = 0; i < 14; i++) {
      const res = await fetch(`${BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.42' },
        body: JSON.stringify({ username: 'nobody-smoke', password: 'wrong' }),
      })
      if (res.status === 429) limited++
    }
    if (limited === 0) throw new Error('no 429 after 14 attempts')
    return `${limited} of 14 requests rate-limited`
  })

  // The Engine.IO transport handshake always succeeds — authentication happens
  // in the namespace middleware — so this has to use a real client and wait for
  // connect_error rather than probing /socket.io over HTTP.
  await check('socket connection rejected without a session', async () => {
    const { io } = await import('socket.io-client')
    const socket = io(BASE, { path: '/socket.io', transports: ['polling'], reconnection: false })

    const outcome = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve('timeout'), 8000)
      socket.on('connect', () => {
        clearTimeout(timer)
        resolve('connected')
      })
      socket.on('connect_error', (err) => {
        clearTimeout(timer)
        resolve(`rejected: ${err.message}`)
      })
    })
    socket.disconnect()

    if (outcome === 'connected') throw new Error('anonymous client was allowed to connect')
    if (outcome === 'timeout') throw new Error('no connect or connect_error within 8s')
    return outcome
  })
}

run()
