// Debug script to test property_vibes table
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('URL:', supabaseUrl)
const supabase = createClient(supabaseUrl, supabaseKey)

async function clearAndGenerate() {
  // Delete all existing vibes
  console.log('Deleting all existing vibes...')
  const { error: deleteError } = await supabase
    .from('property_vibes')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (deleteError) {
    console.error('Delete error:', deleteError)
  } else {
    console.log('All vibes deleted')
  }

  // Verify
  const { count } = await supabase
    .from('property_vibes')
    .select('*', { count: 'exact', head: true })

  console.log('Current count after delete:', count)
}

clearAndGenerate().catch(console.error)
