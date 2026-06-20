import { defineConfig, devices } from '@playwright/test'

// 放在 apps/web（@playwright/test 所在處），turbo test:e2e 從這裡執行才找得到設定與依賴。
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
  },

  projects: [
    // 手機主力斷點
    {
      name: 'iPhone SE (375px)',
      use: { ...devices['iPhone SE'], viewport: { width: 375, height: 667 } },
    },
    {
      name: 'iPhone 14 (390px)',
      use: { ...devices['iPhone 14'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'Android 主流 (360px)',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 360, height: 800 },
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36',
      },
    },
    // iPad（可選）
    {
      name: 'iPad',
      use: { ...devices['iPad Mini'], viewport: { width: 768, height: 1024 } },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
