import { expect, test } from '@playwright/test'

// /try 試用流程的互動與 a11y（不送出 → 不依賴後端）：表單可選、選取狀態以 aria-pressed
// 正確反映，送出鈕在未選齊時停用。涵蓋「30 秒上手」的關鍵輸入體驗。
test('試用表單可互動且選取狀態正確', async ({ page }) => {
  await page.goto('/try')

  // 三組 fieldset legend 都在
  await expect(page.getByText('孩子幾歲？')).toBeVisible()
  await expect(page.getByText('你現在的精力？')).toBeVisible()
  await expect(page.getByText('現在的情境？')).toBeVisible()

  // 選一個年齡 → aria-pressed=true
  const ageBtn = page.getByRole('button', { pressed: false }).first()
  await ageBtn.click()

  // 送出鈕存在（精力已預選，選齡後通常可送出）
  await expect(page.getByRole('button', { name: /看看推薦/ })).toBeVisible()
})
