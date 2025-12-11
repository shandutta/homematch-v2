const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const appHost =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  'http://localhost:3000'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

console.log('Supabase URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const slugify = (value, fallback) => {
  if (!value) return fallback

  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || fallback
  )
}

const getProjectFingerprint = () => {
  let projectSlug = 'supabase'
  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl)
      const hostSlug = slugify(parsed.hostname, 'supabase')
      const pathSlug = slugify(
        parsed.pathname === '/' ? '' : parsed.pathname,
        ''
      )
      projectSlug = pathSlug ? `${hostSlug}-${pathSlug}` : hostSlug
    } catch {
      projectSlug = 'supabase'
    }
  }

  const anonFingerprint = supabaseAnonKey
    ? slugify(supabaseAnonKey.slice(0, 8), 'anon')
    : 'anon'

  return `${projectSlug}-${anonFingerprint}`
}

const getCookieName = (hostname) => {
  const hostSlug = slugify(hostname || 'localhost', 'localhost')
  return `sb-${hostSlug}-${getProjectFingerprint()}-auth-token`
}

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

  let cookieHost = 'localhost'
  let appUrl = { protocol: 'http:', hostname: 'localhost', port: '3000' }
  try {
    const url = new URL(appHost)
    cookieHost = url.hostname
    appUrl = url
  } catch {
    cookieHost = 'localhost'
    appUrl = { protocol: 'http:', hostname: 'localhost', port: '3000' }
  }

  console.log('Using cookie host:', cookieHost)

  const cookieName = getCookieName(cookieHost)
  const cookieValue = JSON.stringify(data.session)
  // Encode the cookie value properly
  const cookieString = `${cookieName}=${encodeURIComponent(cookieValue)}`

  const portSegment =
    appUrl.port || (appUrl.protocol === 'https:' ? '443' : '80')
  const curlTarget = `${appUrl.protocol}//${appUrl.hostname}:${portSegment}/dashboard`

  console.log('\n--- CURL COMMAND ---')
  console.log(`curl -v -I -b "${cookieString}" ${curlTarget}`)
  console.log('--------------------\n')
}

testLogin()
