import { expect, test } from '@playwright/test'

test('restores game UI settings after a page refresh', async ({ page }) => {
  await page.goto('/game/persistence-demo')
  await page.evaluate(() => {
    window.localStorage.setItem('sj.ui.settings.v1', JSON.stringify({
      schemaVersion: 1,
      playerInfoMode: 'always',
      buildingTextMode: 'compact'
    }))
  })

  await page.reload()

  await expect(page.locator('.player-panel__details--always')).toHaveCount(3)
  await expect(page.getByLabel('自己的手牌')).not.toContainText('cost')
})
