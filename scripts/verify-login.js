const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Load .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

console.log('Testing login against:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin() {
  const email = 'test1@example.com'
  const password = 'testpassword123'

  console.log(`Attempting to sign in as ${email}...`)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('❌ Login failed:', error.message)
    process.exit(1)
  }

  console.log('✅ Login successful!')
  console.log('User ID:', data.user.id)
}

testLogin()
