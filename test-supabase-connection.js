const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '.env.test.local') })

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('URL:', supabaseUrl)
console.log('Key exists:', !!supabaseServiceKey)
console.log(
  'Key starts with:',
  supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'undefined'
)

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.test.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

console.log('Testing connection...')
supabase.auth.admin
  .listUsers()
  .then(({ data, error }) => {
    if (error) throw error
    console.log('✅ Success! Users:', data.users.length)
  })
  .catch((e) => {
    console.log('❌ Error:', e.message)
    console.log('Full error:', JSON.stringify(e, null, 2))
  })
