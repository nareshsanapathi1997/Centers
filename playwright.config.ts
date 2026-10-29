import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT || 2500)
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`

/**
 * Smoke-level end-to-end config.
 *
 * `reuseExistingServer` matters locally: the app is served by the custom
 * server.js (Socket.IO), which takes a while to boot, so a dev server that is
 * already running is used as-is.
 *
 * These specs need a seeded database. In CI they run only when E2E_BASE_URL
 * points at an environment that has one.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run start',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
