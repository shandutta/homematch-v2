const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

console.log('Supabase URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin() {
  const email = 'test1@example.com'
  const password = 'testpassword123'

  console.log(`Attempting login for ${email}...`)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Login failed:', error.message)
    return
  }

  console.log('Login successful!')
  console.log('User ID:', data.user.id)

  let projectId = '127.0.0.1'
  try {
    const url = new URL(supabaseUrl)
    const parts = url.hostname.split('.')
    if (parts.length > 0) {
      projectId = parts[0]
    }
  } catch {
    projectId = '127.0.0.1'
  }

  console.log('Project ID (guessed):', projectId)

  const cookieName = `sb-${projectId}-auth-token`
  const cookieValue = JSON.stringify(data.session)
  // Encode the cookie value properly
  const cookieString = `${cookieName}=${encodeURIComponent(cookieValue)}`

  console.log('\n--- CURL COMMAND ---')
  console.log(`curl -v -I -b "${cookieString}" http://localhost:3000/dashboard`)
  console.log('--------------------\n')
}

testLogin()
