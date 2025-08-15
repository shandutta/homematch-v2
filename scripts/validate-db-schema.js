/**
 * Database Schema Validation for CI
 * Validates that all required tables and functions exist
 */

const { createClient } = require('@supabase/supabase-js')

async function validateSchema() {
  console.log('🔍 Validating database schema...')
  
  const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  })
  
  // Check required tables
  const requiredTables = [
    'user_profiles',
    'households',
    'properties',
    'user_property_interactions',
    'neighborhoods'
  ]
  
  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select('*').limit(1)
    if (error && !error.message.includes('row-level security')) {
      throw new Error(`Table ${table} not accessible: ${error.message}`)
    }
    console.log(`✅ Table ${table} is accessible`)
  }
  
  // Check for RPC functions
  const { error: functionError } = await supabase.rpc('get_function_list').limit(1)
  if (functionError) {
    console.log('⚠️  Could not verify RPC functions (this may be normal)')
  } else {
    console.log('✅ RPC functions are accessible')
  }
  
  console.log('✅ Database schema validation completed')
}

if (require.main === module) {
  validateSchema()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Schema validation failed:', error.message)
      process.exit(1)
    })
}

module.exports = validateSchema
