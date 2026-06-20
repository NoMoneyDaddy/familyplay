import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // 對齊 tsconfig 的 "@/*": ["./*"]，讓 route handler 測試能匯入未被 mock 的 @/lib 純函式。
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    exclude: ['node_modules', 'tests/e2e/**'],
  },
})
