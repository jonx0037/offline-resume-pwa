import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // 'node', not 'jsdom'. The only thing under test is src/lib/freshness.ts, which is a
      // pure function with zero Vue imports and no DOM access — so it needs no document, no
      // setup file, and no fake-indexeddb. That is the actual argument for keeping the
      // classifier free of framework imports, and running it in a bare Node environment is
      // what makes the argument checkable rather than rhetorical.
      environment: 'node',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
