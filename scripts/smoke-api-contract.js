/**
 * Exercises the generated center-resource routes and the zod validation layer
 * against a running dev server.
 *
 * These are contract checks, not unit tests: the point is that the refactor kept
 * status codes and shapes intact, including the failure paths that are easy to
 * regress when handlers are generated rather than written out.
 */
require('dotenv').config()

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:2500'

let passed = 0
let failed = 0

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ok   ${name}`)
    passed++
  } else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

async function json(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options)
  let body = null
  try {
    body = await response.json()
  } catch {
    /* non-JSON responses are reported via status alone */
  }
  return { status: response.status, body }
}

const post = (path, body, headers = {}) =>
  json(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

async function main() {
  console.log(`Contract checks against ${BASE}\n`)

  console.log('validation: login')
  {
    const missing = await post('/api/admin/login', { username: 'x' })
    check('missing password is 400', missing.status === 400, `got ${missing.status}`)
    check(
      'field error is reported',
      Boolean(missing.body?.details?.password?.length),
      JSON.stringify(missing.body),
    )

    const blank = await post('/api/admin/login', { username: '   ', password: 'y' })
    check('whitespace username is 400', blank.status === 400, `got ${blank.status}`)

    const malformed = await json('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    })
    check('malformed JSON is 400 not 500', malformed.status === 400, `got ${malformed.status}`)

    const wrong = await post('/api/admin/login', { username: 'nope-does-not-exist', password: 'z' })
    check('unknown user is 401', wrong.status === 401, `got ${wrong.status}`)
    check(
      'no user enumeration in message',
      wrong.body?.error === 'Invalid credentials',
      JSON.stringify(wrong.body),
    )
  }

  console.log('\nvalidation: student otp')
  {
    const shortMobile = await post('/api/student/otp/send', { mobile: '123' })
    check('short mobile is 400', shortMobile.status === 400, `got ${shortMobile.status}`)

    const badPurpose = await post('/api/student/otp/send', {
      mobile: '9999999999',
      purpose: 'not-a-purpose',
    })
    check('unknown purpose is 400', badPurpose.status === 400, `got ${badPurpose.status}`)
  }

  console.log('\nvalidation: payment order')
  {
    const missing = await post('/api/public/course-fees/order', { center_slug: 'x' })
    check('missing fields is 400', missing.status === 400, `got ${missing.status}`)

    const badBatch = await post('/api/public/course-fees/order', {
      center_slug: 'x',
      course_key: 'y',
      student_name: 'Test',
      student_mobile: '9999999999',
      batch_id: 'not-a-number',
    })
    check('non-numeric batch_id is 400', badBatch.status === 400, `got ${badBatch.status}`)
  }

  console.log('\ngenerated routes: alerts')
  {
    const list = await json('/api/admin/alerts?centerId=1')
    check('list returns 200', list.status === 200, `got ${list.status}`)
    check('list returns an array', Array.isArray(list.body), typeof list.body)

    const noCenter = await json('/api/admin/alerts')
    check('missing centerId is 400', noCenter.status === 400, `got ${noCenter.status}`)

    const badCenter = await json('/api/admin/alerts?centerId=abc')
    check('non-numeric centerId is 400', badCenter.status === 400, `got ${badCenter.status}`)

    const unauth = await post('/api/admin/alerts', {
      center_id: 1,
      title: 'Smoke',
      message: 'Smoke',
    })
    check('create without token is 401', unauth.status === 401, `got ${unauth.status}`)

    const badBody = await post(
      '/api/admin/alerts',
      { center_id: 1, title: '', message: 'x' },
      { Authorization: 'Bearer invalid' },
    )
    // Validation runs before auth, so an empty title is reported as 400.
    check('empty title is 400', badBody.status === 400, `got ${badBody.status}`)

    const badType = await post(
      '/api/admin/alerts',
      { center_id: 1, title: 'x', message: 'y', alert_type: 'explode' },
      { Authorization: 'Bearer invalid' },
    )
    check('unknown alert_type is 400', badType.status === 400, `got ${badType.status}`)

    const forged = await post(
      '/api/admin/alerts',
      { center_id: 1, title: 'x', message: 'y' },
      { Authorization: 'Bearer invalid' },
    )
    check('invalid token is 403', forged.status === 403, `got ${forged.status}`)
  }

  console.log('\ngenerated routes: cta-sliders and student-stories')
  {
    const sliders = await json('/api/admin/cta-sliders?centerId=1')
    check('cta-sliders list is 200', sliders.status === 200, `got ${sliders.status}`)

    const stories = await json('/api/admin/student-stories?centerId=1')
    check('student-stories list is 200', stories.status === 200, `got ${stories.status}`)

    const missingItem = await json('/api/admin/alerts/99999999', { method: 'DELETE' })
    check(
      'delete of unknown id is 404',
      missingItem.status === 404,
      `got ${missingItem.status}`,
    )

    const badId = await json('/api/admin/alerts/not-an-id', { method: 'DELETE' })
    check('non-numeric id is 400', badId.status === 400, `got ${badId.status}`)
  }

  console.log('\npagination')
  {
    const capped = await json('/api/super-admin/students?pageSize=99999')
    check(
      'oversized pageSize is rejected',
      capped.status === 400 || capped.status === 403,
      `got ${capped.status}`,
    )

    const logs = await json('/api/admin/activity-logs?centerId=1&limit=99999')
    check(
      'oversized activity-log limit is rejected',
      logs.status === 400 || logs.status === 401,
      `got ${logs.status}`,
    )
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error('Smoke run failed:', error.message)
  process.exitCode = 1
})
