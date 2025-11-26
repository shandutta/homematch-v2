const { createClient } = require('@supabase/supabase-js')

async function test() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Get an existing property to try upserting
  const { data: existing } = await client
    .from('properties')
    .select('*')
    .limit(1)
  if (!existing || !existing[0]) {
    console.log('No existing properties found')
    return
  }

  const prop = existing[0]
  console.log('Testing upsert on existing property:', prop.zpid, prop.city)

  // Try upserting the same property with updated timestamp
  const upsertData = {
    ...prop,
    updated_at: new Date().toISOString(),
  }

  const result = await client
    .from('properties')
    .upsert(upsertData, { onConflict: 'zpid' })

  console.log('Full result object:', JSON.stringify(result, null, 2))
  console.log('')
  console.log('error is null:', result.error === null)
  console.log('error is undefined:', result.error === undefined)
  console.log('error is truthy:', !!result.error)
  console.log('typeof error:', typeof result.error)

  if (result.error) {
    console.log('Error keys:', Object.keys(result.error))
    console.log('Error message:', result.error.message)
    console.log('Error code:', result.error.code)
  }
}

test().catch(console.error)
