import { test } from '@playwright/test'

test('prints snapshot paths', async (_args, testInfo) => {
  console.log(
    'desktop',
    testInfo.snapshotPath('liked-card-desktop.png'),
    testInfo.snapshotPath('liked-card-mobile.png')
  )
})
