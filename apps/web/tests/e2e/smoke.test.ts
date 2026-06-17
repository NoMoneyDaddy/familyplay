import { expect, test } from '@playwright/test'

test('首頁載入並顯示陪伴流程', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('FamilyPlay')).toBeVisible()
  await expect(page.getByText('孩子大概幾歲？')).toBeVisible()
  await expect(page.getByRole('button', { name: /拿到陪伴方案/ })).toBeVisible()
})

test('完成選擇後可以拿到陪伴方案', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '2–3 歲' }).click()
  await page.getByRole('button', { name: '還可以' }).click()
  await page.getByRole('button', { name: '15 分鐘' }).click()
  await page.getByRole('button', { name: /拿到陪伴方案/ }).click()

  await expect(page.getByText('今天可以這樣陪')).toBeVisible()
})

test('health check 回傳 ok', async ({ page }) => {
  const response = await page.request.get('/api/health')
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.status).toBe('ok')
})
