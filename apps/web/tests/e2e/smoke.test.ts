import { expect, test } from '@playwright/test'

test('首頁載入正常', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('FamilyPlay')).toBeVisible()
  await expect(page.getByRole('button', { name: /快給我一個/ })).toBeVisible()
})

test('health check 回傳 ok', async ({ page }) => {
  const response = await page.request.get('/api/health')
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.status).toBe('ok')
})
