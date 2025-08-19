#!/usr/bin/env node

/**
 * Debug authentication flow for E2E tests
 */

const { chromium } = require('playwright')

async function debugAuth() {
  console.log('🔍 Starting authentication debug...')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Navigate to login page
    console.log('📝 Navigating to login page...')
    await page.goto('http://localhost:3000/login')
    await page.waitForLoadState('domcontentloaded')

    // Fill in test credentials
    console.log('📝 Filling in credentials...')
    const emailInput = await page.waitForSelector(
      '[data-testid="email-input"]',
      { timeout: 10000 }
    )
    const passwordInput = await page.waitForSelector(
      '[data-testid="password-input"]',
      { timeout: 10000 }
    )

    await emailInput.fill('test-worker-0@example.com')
    await passwordInput.fill('testpassword123')

    // Verify inputs
    const emailValue = await emailInput.inputValue()
    const passwordValue = await passwordInput.inputValue()
    console.log('📧 Email entered:', emailValue)
    console.log('🔒 Password entered:', passwordValue ? '***' : 'EMPTY')

    // Wait and click submit
    console.log('🚀 Submitting form...')
    const submitButton = await page.waitForSelector(
      '[data-testid="signin-button"]'
    )
    await submitButton.click()

    // Wait a bit to see what happens
    await page.waitForTimeout(5000)

    // Check for errors
    const alerts = await page.locator('[role="alert"]').all()
    if (alerts.length > 0) {
      console.log('⚠️  Found alerts:')
      for (const alert of alerts) {
        const text = await alert.textContent()
        console.log('   -', text)
      }
    }

    // Check current URL
    const currentUrl = page.url()
    console.log('🌐 Current URL:', currentUrl)

    // Check if we're still on login page
    if (currentUrl.includes('/login')) {
      console.log('❌ Still on login page - authentication failed')

      // Check page content for clues
      const bodyText = await page.locator('body').textContent()
      if (bodyText.includes('Invalid')) {
        console.log('❗ Page contains "Invalid" - likely credential error')
      }
      if (bodyText.includes('credentials')) {
        console.log('❗ Page contains "credentials" - likely credential error')
      }
    } else {
      console.log('✅ Navigation successful - authentication worked')
    }
  } catch (error) {
    console.error('❌ Debug error:', error.message)
  } finally {
    await page.waitForTimeout(5000) // Keep browser open briefly
    await browser.close()
  }
}

debugAuth().catch(console.error)
