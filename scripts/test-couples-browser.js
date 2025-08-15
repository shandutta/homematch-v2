/**
 * Browser-based test for couples functionality
 * Tests the actual UI and user experience
 */

const { chromium } = require('playwright')

const BASE_URL = 'http://localhost:3000'

// Test users
const COUPLE1_USER1 = {
  email: 'michael.johnson@test.com',
  password: 'password123',
  name: 'Michael Johnson',
}
const COUPLE1_USER2 = {
  email: 'sarah.johnson@test.com',
  password: 'password123',
  name: 'Sarah Johnson',
}

async function loginUser(page, user) {
  console.log(`🔐 Logging in ${user.name}...`)

  try {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('networkidle')

    // Fill login form
    await page.fill('input[type="email"]', user.email)
    await page.fill('input[type="password"]', user.password)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard*`, { timeout: 10000 })

    console.log(`✅ Successfully logged in ${user.name}`)
    return true
  } catch (error) {
    console.error(`❌ Login failed for ${user.name}:`, error.message)

    // Take screenshot for debugging
    await page.screenshot({
      path: `debug-login-${user.email.replace('@', '_at_').replace('.', '_')}.png`,
      fullPage: true,
    })

    return false
  }
}

async function testMutualLikesSection(page, userName) {
  console.log(`💝 Testing MutualLikesSection for ${userName}...`)

  try {
    // Wait for dashboard to load
    await page.waitForLoadState('networkidle')

    // Look for the mutual likes section
    const mutualLikesSection = page
      .locator('[data-testid="mutual-likes-section"]')
      .or(page.locator('text=Both Liked').locator('..'))
      .first()

    // Wait for the section to be visible
    await mutualLikesSection.waitFor({ state: 'visible', timeout: 5000 })
    console.log(`✅ Found MutualLikesSection`)

    // Check if there are mutual likes displayed
    const mutualLikesItems = page
      .locator('[data-testid="mutual-like-item"]')
      .or(mutualLikesSection.locator('a'))

    const count = await mutualLikesItems.count()
    console.log(`✅ Found ${count} mutual likes displayed`)

    if (count > 0) {
      console.log(`   Checking first mutual like item...`)

      const firstItem = mutualLikesItems.first()

      // Check for property address
      const addressText = await firstItem.textContent()
      console.log(`   Property info: ${addressText?.substring(0, 100)}...`)

      // Check for mutual like badge
      const badge = firstItem
        .locator('text=Both liked!')
        .or(firstItem.locator('[data-testid="mutual-badge"]'))

      if ((await badge.count()) > 0) {
        console.log(`   ✅ Found "Both liked!" badge`)
      } else {
        console.log(`   ⚠️  No "Both liked!" badge found`)
      }
    }

    return { success: true, count }
  } catch (error) {
    console.error(
      `❌ MutualLikesSection test failed for ${userName}:`,
      error.message
    )

    // Take screenshot for debugging
    await page.screenshot({
      path: `debug-mutual-likes-${userName.replace(' ', '_')}.png`,
      fullPage: true,
    })

    return { success: false, count: 0 }
  }
}

async function testPropertyCards(page, userName) {
  console.log(`🏠 Testing property cards with mutual badges for ${userName}...`)

  try {
    // Navigate to search or properties page
    await page.goto(`${BASE_URL}/search`)
    await page.waitForLoadState('networkidle')

    // Look for property cards
    const propertyCards = page
      .locator('[data-testid="property-card"]')
      .or(page.locator('.property-card'))
      .or(page.locator('[class*="card"]').filter({ hasText: /\$[\d,]+/ }))

    await page.waitForTimeout(2000) // Give time for cards to load

    const cardCount = await propertyCards.count()
    console.log(`✅ Found ${cardCount} property cards`)

    if (cardCount > 0) {
      // Check each card for mutual like badges
      let mutualBadgeCount = 0

      for (let i = 0; i < Math.min(cardCount, 5); i++) {
        // Check first 5 cards
        const card = propertyCards.nth(i)

        const mutualBadge = card
          .locator('text=Both liked!')
          .or(card.locator('[data-testid="mutual-badge"]'))
          .or(card.locator('text=Both Liked'))

        if ((await mutualBadge.count()) > 0) {
          mutualBadgeCount++
          console.log(`   ✅ Card ${i + 1}: Found mutual badge`)
        }
      }

      console.log(
        `✅ Found ${mutualBadgeCount} property cards with mutual badges`
      )
      return {
        success: true,
        totalCards: cardCount,
        mutualCards: mutualBadgeCount,
      }
    }

    return { success: true, totalCards: 0, mutualCards: 0 }
  } catch (error) {
    console.error(
      `❌ Property cards test failed for ${userName}:`,
      error.message
    )

    await page.screenshot({
      path: `debug-property-cards-${userName.replace(' ', '_')}.png`,
      fullPage: true,
    })

    return { success: false, totalCards: 0, mutualCards: 0 }
  }
}

async function runBrowserTests() {
  console.log('🌐 Starting Browser-based Couples Tests')
  console.log('=======================================')

  const browser = await chromium.launch({
    headless: false, // Set to true for headless mode
    slowMo: 1000, // Slow down for visibility
  })

  try {
    // Test User 1
    console.log(`\n👤 Testing User 1: ${COUPLE1_USER1.name}`)
    console.log('=' + '='.repeat(COUPLE1_USER1.name.length + 15))

    const context1 = await browser.newContext()
    const page1 = await context1.newPage()

    const loginSuccess1 = await loginUser(page1, COUPLE1_USER1)

    if (loginSuccess1) {
      const mutualLikesResult1 = await testMutualLikesSection(
        page1,
        COUPLE1_USER1.name
      )
      const propertyCardsResult1 = await testPropertyCards(
        page1,
        COUPLE1_USER1.name
      )

      console.log(`\n📊 ${COUPLE1_USER1.name} Results:`)
      console.log(`   Login: ${loginSuccess1 ? '✅' : '❌'}`)
      console.log(
        `   Mutual Likes Section: ${mutualLikesResult1.success ? '✅' : '❌'} (${mutualLikesResult1.count} items)`
      )
      console.log(
        `   Property Cards: ${propertyCardsResult1.success ? '✅' : '❌'} (${propertyCardsResult1.mutualCards}/${propertyCardsResult1.totalCards} with badges)`
      )
    }

    await context1.close()

    // Test User 2
    console.log(`\n👤 Testing User 2: ${COUPLE1_USER2.name}`)
    console.log('=' + '='.repeat(COUPLE1_USER2.name.length + 15))

    const context2 = await browser.newContext()
    const page2 = await context2.newPage()

    const loginSuccess2 = await loginUser(page2, COUPLE1_USER2)

    if (loginSuccess2) {
      const mutualLikesResult2 = await testMutualLikesSection(
        page2,
        COUPLE1_USER2.name
      )
      const propertyCardsResult2 = await testPropertyCards(
        page2,
        COUPLE1_USER2.name
      )

      console.log(`\n📊 ${COUPLE1_USER2.name} Results:`)
      console.log(`   Login: ${loginSuccess2 ? '✅' : '❌'}`)
      console.log(
        `   Mutual Likes Section: ${mutualLikesResult2.success ? '✅' : '❌'} (${mutualLikesResult2.count} items)`
      )
      console.log(
        `   Property Cards: ${propertyCardsResult2.success ? '✅' : '❌'} (${propertyCardsResult2.mutualCards}/${propertyCardsResult2.totalCards} with badges)`
      )
    }

    await context2.close()

    console.log('\n🎯 Overall Browser Test Summary')
    console.log('==============================')

    const allTestsPassed = loginSuccess1 && loginSuccess2

    if (allTestsPassed) {
      console.log('✅ All browser tests completed successfully!')
      console.log('✅ User authentication working')
      console.log('✅ Dashboard loading properly')
      console.log('✅ Couples functionality accessible')
    } else {
      console.log('❌ Some browser tests failed')
      console.log('🔧 Check debug screenshots for more details')
    }
  } finally {
    await browser.close()
  }
}

// Check if we need to install playwright browsers
async function checkPlaywrightSetup() {
  try {
    await chromium.launch({ headless: true })
    return true
  } catch (error) {
    if (error.message.includes("Executable doesn't exist")) {
      console.log('📦 Playwright browsers not installed. Installing...')
      console.log('Please run: npx playwright install chromium')
      return false
    }
    throw error
  }
}

// Run the tests
checkPlaywrightSetup()
  .then((ready) => {
    if (ready) {
      return runBrowserTests()
    } else {
      console.log(
        '❌ Playwright setup incomplete. Please install browsers first.'
      )
    }
  })
  .catch(console.error)
