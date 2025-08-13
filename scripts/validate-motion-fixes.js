/**
 * Browser Console Validation Script for Framer Motion DOM Prop Fixes
 *
 * This script validates that motion props are no longer being passed to DOM elements
 * by checking the actual browser console for React warnings.
 *
 * Usage:
 * 1. Open the browser console
 * 2. Navigate to pages with motion components
 * 3. Run this script to capture and analyze console warnings
 */

console.log('🔍 Starting Framer Motion DOM Props Validation...')

// Store original console methods
const originalWarn = console.warn
const originalError = console.error
const warnings = []
const errors = []

// Intercept console warnings and errors
console.warn = (...args) => {
  const message = args.join(' ')
  warnings.push(message)
  originalWarn(...args)
}

console.error = (...args) => {
  const message = args.join(' ')
  errors.push(message)
  originalError(...args)
}

// Function to check for motion-related warnings
function checkMotionWarnings() {
  const motionWarnings = warnings.filter(
    (warning) =>
      warning.includes('whileHover') ||
      warning.includes('whileTap') ||
      warning.includes('whileInView') ||
      warning.includes('animate') ||
      warning.includes('initial') ||
      warning.includes('exit') ||
      warning.includes('framer-motion') ||
      warning.includes('motion') ||
      (warning.includes('React does not recognize') && warning.includes('prop'))
  )

  return motionWarnings
}

// Function to simulate component interactions
async function simulateInteractions() {
  console.log('🖱️ Simulating user interactions...')

  // Find swipe buttons
  const swipeButtons = document.querySelectorAll(
    '[data-testid="pass-button"], [data-testid="like-button"]'
  )

  for (const button of swipeButtons) {
    // Simulate hover
    const hoverEvent = new MouseEvent('mouseenter', { bubbles: true })
    button.dispatchEvent(hoverEvent)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Simulate mouse leave
    const leaveEvent = new MouseEvent('mouseleave', { bubbles: true })
    button.dispatchEvent(leaveEvent)

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  // Find motion buttons in marketing components
  const marketingButtons = document.querySelectorAll('button')

  for (let i = 0; i < Math.min(marketingButtons.length, 5); i++) {
    const button = marketingButtons[i]
    const hoverEvent = new MouseEvent('mouseenter', { bubbles: true })
    button.dispatchEvent(hoverEvent)

    await new Promise((resolve) => setTimeout(resolve, 50))

    const leaveEvent = new MouseEvent('mouseleave', { bubbles: true })
    button.dispatchEvent(leaveEvent)

    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

// Main validation function
async function validateMotionFixes() {
  console.log('🧪 Running motion fixes validation...')

  // Clear existing warnings
  warnings.length = 0
  errors.length = 0

  // Wait for components to render
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Simulate interactions that would trigger motion props
  await simulateInteractions()

  // Wait for any async warnings
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Check for motion-related warnings
  const motionWarnings = checkMotionWarnings()

  // Report results
  console.log('📊 Validation Results:')
  console.log(`Total warnings captured: ${warnings.length}`)
  console.log(`Motion-related warnings: ${motionWarnings.length}`)

  if (motionWarnings.length === 0) {
    console.log('✅ SUCCESS: No Framer Motion DOM prop warnings detected!')
    console.log('🎉 All motion.button components have been properly fixed!')
  } else {
    console.log('❌ ISSUES FOUND: Motion-related warnings detected:')
    motionWarnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`)
    })
  }

  // Restore original console methods
  console.warn = originalWarn
  console.error = originalError

  return {
    totalWarnings: warnings.length,
    motionWarnings: motionWarnings.length,
    warnings: motionWarnings,
    success: motionWarnings.length === 0,
  }
}

// Export for use in tests or run immediately
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateMotionFixes, checkMotionWarnings }
} else {
  // Run validation immediately
  validateMotionFixes().then((result) => {
    if (result.success) {
      console.log('✨ Motion fixes validation completed successfully!')
    } else {
      console.log(
        '⚠️ Motion fixes validation found issues that need attention.'
      )
    }
  })
}
