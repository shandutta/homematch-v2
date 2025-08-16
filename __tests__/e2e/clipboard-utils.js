/**
 * Clipboard helper utilities for E2E tests
 * Plain JS to avoid TypeScript module issues
 */

/**
 * Grant clipboard permissions with browser-specific handling
 * WebKit doesn't support clipboard-write permission
 */
async function grantClipboardPermissions(context, browserName) {
  if (browserName === 'webkit') {
    // WebKit doesn't support clipboard-write permission
    // Skip permission granting for WebKit
    console.log('Skipping clipboard permissions for WebKit (not supported)')
    return
  }
  
  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  } catch (error) {
    console.log(`Warning: Could not grant clipboard permissions: ${error}`)
  }
}

/**
 * Check if clipboard API is available in the current browser
 */
async function isClipboardAvailable(page) {
  return await page.evaluate(() => {
    return typeof navigator.clipboard !== 'undefined' && 
           typeof navigator.clipboard.readText === 'function' &&
           typeof navigator.clipboard.writeText === 'function'
  })
}

/**
 * Read clipboard with fallback handling
 */
async function readClipboard(page, browserName) {
  if (browserName === 'webkit') {
    // WebKit has limited clipboard API support in tests
    console.log('Clipboard read not supported in WebKit tests')
    return null
  }
  
  try {
    const available = await isClipboardAvailable(page)
    if (!available) {
      console.log('Clipboard API not available')
      return null
    }
    
    return await page.evaluate(() => navigator.clipboard.readText())
  } catch (error) {
    console.log(`Could not read clipboard: ${error}`)
    return null
  }
}

module.exports = {
  grantClipboardPermissions,
  isClipboardAvailable,
  readClipboard
}