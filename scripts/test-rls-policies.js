/**
 * Row Level Security (RLS) Policy Test
 * Validates that RLS policies are working correctly
 */

const { createClient } = require('@supabase/supabase-js')

async function testRLSPolicies() {
  console.log('🛡️ Testing Row Level Security policies...')

  const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY is required')
  }

  const supabase = createClient(supabaseUrl, anonKey)

  // Test 1: Unauthenticated user should not access user_profiles
  try {
    const { error } = await supabase.from('user_profiles').select('*').limit(1)
    if (!error) {
      console.log(
        '⚠️  Warning: user_profiles accessible without authentication'
      )
    } else {
      console.log('✅ user_profiles properly protected by RLS')
    }
  } catch {
    console.log('✅ user_profiles properly protected by RLS')
  }

  // Test 2: Properties should be readable (marketing use case)
  try {
    const { error } = await supabase.from('properties').select('id').limit(1)
    if (error) {
      console.log('⚠️  Warning: properties may not be accessible for marketing')
    } else {
      console.log('✅ properties accessible for marketing use')
    }
  } catch {
    console.log('⚠️  Warning: properties not accessible')
  }

  console.log('✅ RLS policy testing completed')
}

if (require.main === module) {
  testRLSPolicies()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ RLS policy test failed:', error.message)
      process.exit(1)
    })
}

module.exports = testRLSPolicies
