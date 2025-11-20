const { createClient } = require('@supabase/supabase-js')

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
// Use the service role key from environment (configurable via .env.prod / .env.test.local)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    '❌ Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment'
  )
  process.exit(1)
}

console.log('URL:', supabaseUrl)
console.log('Testing with service role key from environment...')

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

supabase.auth.admin
  .listUsers()
  .then(({ data, error }) => {
    if (error) throw error
    console.log('✅ Success! Users:', data.users.length)
  })
  .catch((e) => {
    console.log('❌ Error:', e.message || JSON.stringify(e))
    console.log('Full error:', JSON.stringify(e, null, 2))
  })
