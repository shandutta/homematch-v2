const { createClient } = require('@supabase/supabase-js')

async function test() {
  console.log('=== Environment Check ===')
  console.log(
    'NEXT_PUBLIC_SUPABASE_URL:',
    process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET'
  )
  console.log(
    'SUPABASE_SERVICE_ROLE_KEY:',
    process.env.SUPABASE_SERVICE_ROLE_KEY
      ? 'SET (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')'
      : 'NOT SET'
  )

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Test 1: Simple select (should work)
  console.log('\n=== Test 1: Simple SELECT ===')
  const { data: selectData, error: selectError } = await client
    .from('properties')
    .select('zpid, city')
    .limit(1)
  console.log('Select result:', selectData?.[0] || 'no data')
  console.log('Select error:', selectError)

  if (!selectData?.[0]) {
    console.log('No properties found, cannot continue tests')
    return
  }

  // Test 2: Direct update (should work if service key is valid)
  console.log('\n=== Test 2: Direct UPDATE ===')
  const testZpid = selectData[0].zpid
  const {
    error: updateError,
    count: updateCount,
    status: updateStatus,
  } = await client
    .from('properties')
    .update({ updated_at: new Date().toISOString() })
    .eq('zpid', testZpid)
    .select()
  console.log('Update status:', updateStatus)
  console.log('Update count:', updateCount)
  console.log('Update error:', updateError)
  console.log('Update error JSON:', JSON.stringify(updateError))

  // Test 3: Upsert with minimal data
  console.log('\n=== Test 3: UPSERT minimal ===')
  const minimalUpsert = {
    zpid: testZpid,
    updated_at: new Date().toISOString(),
  }
  const { error: minError, status: minStatus } = await client
    .from('properties')
    .upsert(minimalUpsert, { onConflict: 'zpid' })
  console.log('Minimal upsert status:', minStatus)
  console.log('Minimal upsert error:', minError)
  console.log('Minimal upsert error JSON:', JSON.stringify(minError))

  // Test 4: Get full property and try re-upserting
  console.log('\n=== Test 4: Full property UPSERT ===')
  const { data: fullProp } = await client
    .from('properties')
    .select('*')
    .eq('zpid', testZpid)
    .single()

  if (fullProp) {
    const { error: fullError, status: fullStatus } = await client
      .from('properties')
      .upsert(
        { ...fullProp, updated_at: new Date().toISOString() },
        { onConflict: 'zpid' }
      )
    console.log('Full upsert status:', fullStatus)
    console.log('Full upsert error:', fullError)
    console.log('Full upsert error JSON:', JSON.stringify(fullError))
  }

  // Test 5: Batch upsert (like ingestion does)
  console.log('\n=== Test 5: Batch UPSERT (2 properties) ===')
  const { data: batchProps } = await client
    .from('properties')
    .select('*')
    .limit(2)

  if (batchProps?.length) {
    const batchInserts = batchProps.map((p) => ({
      ...p,
      updated_at: new Date().toISOString(),
    }))
    const {
      error: batchError,
      status: batchStatus,
      count: batchCount,
    } = await client
      .from('properties')
      .upsert(batchInserts, { onConflict: 'zpid' })
    console.log('Batch upsert status:', batchStatus)
    console.log('Batch upsert count:', batchCount)
    console.log('Batch upsert error:', batchError)
    console.log('Batch upsert error JSON:', JSON.stringify(batchError))
  }
}

test().catch(console.error)
