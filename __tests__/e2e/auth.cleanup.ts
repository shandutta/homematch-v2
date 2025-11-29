/**
 * Auth cleanup for Playwright tests
 * Cleans up auth storage files after test completion
 */

import { test as cleanup } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authDir = path.join(__dirname, '../../playwright/.auth')

cleanup('clean up auth storage files', async () => {
  console.log('🧹 Cleaning up auth storage files...')

  try {
    if (fs.existsSync(authDir)) {
      const files = fs.readdirSync(authDir)
      for (const file of files) {
        const filePath = path.join(authDir, file)
        if (file.startsWith('user-worker-') && file.endsWith('.json')) {
          fs.unlinkSync(filePath)
          console.log(`   Removed ${file}`)
        }
      }
    }
    console.log('✅ Auth cleanup completed')
  } catch (error) {
    console.warn('⚠️  Auth cleanup warning:', error)
    // Don't fail tests if cleanup has issues
  }
})
