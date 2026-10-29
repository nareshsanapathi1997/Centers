import { expect, test } from '@playwright/test'

/**
 * Covers the guarantees that are cheap to break and expensive to notice: the
 * middleware gate on the admin areas, and the API failure contract.
 *
 * Deliberately does not sign in — credentials differ per environment, and the
 * value here is in asserting that an *unauthenticated* visitor cannot reach an
 * admin screen.
 */

test.describe('route protection', () => {
  for (const path of [
    '/admin/1/dashboard',
    '/admin/1/settings',
    '/super-admin/centers',
    '/super-admin/settings/global',
  ]) {
    test(`${path} redirects an anonymous visitor to a login page`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await expect(page).toHaveURL(/\/(admin|super-admin)\/login/)
    })
  }

  test('login pages render their form', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('input[type="password"]')).toBeVisible()

    await page.goto('/super-admin/login')
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})

test.describe('security headers', () => {
  test('a page response carries the hardening headers', async ({ request }) => {
    const response = await request.get('/admin/login')
    const headers = response.headers()

    expect(headers['x-frame-options']).toBeTruthy()
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['content-security-policy']).toContain("default-src 'self'")
    expect(headers['referrer-policy']).toBeTruthy()
  })
})

test.describe('api contract', () => {
  test('an unauthenticated write is rejected', async ({ request }) => {
    const response = await request.post('/api/admin/alerts', {
      data: { center_id: 1, title: 'e2e', message: 'e2e' },
    })
    expect(response.status()).toBe(401)
  })

  test('an invalid body is a 400 with field details', async ({ request }) => {
    const response = await request.post('/api/admin/login', { data: { username: 'x' } })
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.details).toHaveProperty('password')
  })

  test('a bad login does not reveal whether the user exists', async ({ request }) => {
    const response = await request.post('/api/admin/login', {
      data: { username: 'definitely-not-a-user', password: 'wrong-password' },
    })
    expect(response.status()).toBe(401)
    expect((await response.json()).error).toBe('Invalid credentials')
  })

  test('a list endpoint rejects a missing tenant id', async ({ request }) => {
    expect((await request.get('/api/admin/alerts')).status()).toBe(400)
  })

  test('course materials are not readable straight from /uploads', async ({ request }) => {
    const response = await request.get('/api/uploads/course-materials/anything.pdf')
    expect(response.status()).toBeGreaterThanOrEqual(400)
  })

  test('a diagnostic endpoint is not exposed anonymously', async ({ request }) => {
    expect((await request.get('/api/test-db')).status()).toBeGreaterThanOrEqual(400)
  })
})
