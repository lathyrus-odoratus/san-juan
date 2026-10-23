import { expect, test } from '@playwright/test'

test('game table asks visitors without a session to log in', async ({ page }) => {
  await page.goto('/game/demo')

  await expect(page.getByRole('heading', { name: '聖胡安' })).toBeVisible()
  const notice = page.getByLabel('牌局載入失敗')
  await expect(notice).toContainText('請先用 Discord 登入')
  await expect(notice.getByRole('link', { name: 'Discord 登入' })).toHaveAttribute('href', '/api/auth/discord/login')
  await expect(notice.getByRole('link', { name: '回到大廳' })).toHaveAttribute('href', '/lobby')
  await expect(page.getByLabel('遊戲桌面')).toHaveCount(0)
})
