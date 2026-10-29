import { defineConfig } from 'vitest/config'
import path from 'node:path'

// .mts so Vite loads it as ESM; the package is CommonJS because of server.js.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    // Playwright specs live under tests/e2e and are run by its own runner.
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
  },
  resolve: {
    // Mirror the '@/*' path alias from tsconfig.json.
    alias: { '@': path.resolve(import.meta.dirname) },
  },
})
