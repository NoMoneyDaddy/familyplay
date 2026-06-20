import { expect, test } from '@playwright/test'

// 公開頁（不需登入、不依賴 Supabase 連線）— 確保法務/方案頁恆常可達，
// 並做基本 a11y 檢查（單一 h1、頁面標題正確）。

const LEGAL_PAGES = [
  { path: '/terms', heading: '服務條款' },
  { path: '/privacy', heading: '隱私權政策' },
  { path: '/disclaimer', heading: '免責聲明' },
]

for (const { path, heading } of LEGAL_PAGES) {
  test(`${path} 載入並顯示標題「${heading}」`, async ({ page }) => {
    const res = await page.goto(path)
    expect(res?.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
  })
}

test('/pricing 顯示三個方案', async ({ page }) => {
  await page.goto('/pricing')
  // 等載入狀態結束後三張方案卡都在
  await expect(page.getByRole('heading', { name: '免費', level: 2 })).toBeVisible()
  await expect(page.getByRole('heading', { name: '支持者', level: 2 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Plus', level: 2 })).toBeVisible()
})

test('/offline 離線回退頁可達', async ({ page }) => {
  const res = await page.goto('/offline')
  expect(res?.status()).toBeLessThan(400)
})
