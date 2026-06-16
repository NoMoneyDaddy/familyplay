import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
      },
      include: ['src/safety.ts'],
    },
  },
})
