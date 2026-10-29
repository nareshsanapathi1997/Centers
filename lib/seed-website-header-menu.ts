/* Re-export the CommonJS seed helper for App Router API routes. */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { runWebsiteHeaderMenuSeed } = require('../scripts/seed-website-header-menu.js') as {
  runWebsiteHeaderMenuSeed: (client: unknown, opts?: { reset?: boolean }) => Promise<void>
}

export { runWebsiteHeaderMenuSeed }
