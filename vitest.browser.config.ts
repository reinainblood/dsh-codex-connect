import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

const packageVersion = (JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }).version

export default defineConfig({
  resolve: {
    // The Desktop 2.0.4 compatibility suite links host UI packages from the
    // application bundle; keep one React instance across those symlinks.
    dedupe: ['react', 'react-dom'],
  },
  define: {
    __CODEX_CONNECT_VERSION__: JSON.stringify(packageVersion),
  },
  test: {
    include: ['tests/browser/**/*.browser.client.spec.tsx'],
    testTimeout: 30_000,
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
  },
})
