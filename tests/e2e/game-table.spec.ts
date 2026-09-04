import { expect, test } from '@playwright/test'

test('game table shell renders primary zones', async ({ page }) => {
  await page.goto('/game/demo')

  await expect(page.getByRole('heading', { name: 'Game demo' })).toBeVisible()
  await expect(page.getByLabel('中央公共區')).toContainText('Deck')
  await expect(page.getByLabel('中央公共區')).toContainText('Price Card')
  await expect(page.getByLabel('遊戲指引')).toContainText('桌面已載入')
  await expect(page.getByLabel('自己的手牌')).toContainText('Smithy')
  await expect(page.getByText(/^v\d+\.\d+\.\d+$/)).toBeVisible()
})
