import { beforeAll, afterAll } from 'vitest'
import { config } from 'dotenv'

// Load test environment variables
config({ path: '.env.test.local' })

beforeAll(async () => {
  // Ensure dev server is running
  console.log('🌐 E2E API tests require dev server running on http://localhost:3000')
  
  // Check if server is accessible
  try {
    const response = await fetch('http://localhost:3000/api/health')
    if (!response.ok) {
      console.warn('⚠️  Dev server may not be ready. Status:', response.status)
    } else {
      console.log('✅ Dev server is running and accessible')
    }
  } catch (error) {
    console.error('❌ Dev server is not running! Start with: pnpm run dev')
    console.error('   Error:', error)
    process.exit(1)
  }
})

afterAll(async () => {
  // Cleanup if needed
  console.log('🏁 E2E API tests completed')
})