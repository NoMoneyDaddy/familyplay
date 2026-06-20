import { expect, test } from '@playwright/test'

// 不需登入即可跑的煙霧測試：未登入時根路徑導向 /try（先給價值、不強制註冊）。
test('未登入根路徑導向免費試用 /try', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/try$/)
  await expect(page.getByText('免費試試看')).toBeVisible()
  await expect(page.getByRole('button', { name: /看看推薦/ })).toBeVisible()
})

test('health check 回傳 ok', async ({ page }) => {
  const response = await page.request.get('/api/health')
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.status).toBe('ok')
})
