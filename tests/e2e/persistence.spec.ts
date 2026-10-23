import { expect, test } from '@playwright/test'

// The game itself lives on the server and is fetched again on reload; only UI settings stay in LocalStorage.
test('keeps UI settings across a page refresh without storing the game locally', async ({ page }) => {
  await page.goto('/game/persistence-demo')
  await page.evaluate(() => {
    window.localStorage.setItem('sj.ui.settings.v1', JSON.stringify({
      schemaVersion: 1,
      playerInfoMode: 'always',
      buildingTextMode: 'compact'
    }))
  })

  await page.reload()
  await page.getByLabel('開啟操作面板').click()

  const drawer = page.getByLabel('操作與設定')
  await expect(drawer.getByRole('button', { name: 'always' })).toHaveAttribute('aria-pressed', 'true')
  await expect(drawer.getByRole('button', { name: 'compact' })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => window.localStorage.getItem('sj.game.snapshot.v1'))).toBeNull()
})
