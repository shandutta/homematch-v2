#!/usr/bin/env node

/**
 * Test RPC Functions
 * 
 * This script tests the actual RPC functions against the local Supabase database
 * to verify they exist and work correctly.
 */

const { createClient } = require('@supabase/supabase-js')

// Use local Supabase instance
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.tQwoQ-dh_iOZ9Hp4dXWtu12rIUbyaXU2G0_SBoWKZJo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRPCFunctions() {
  console.log('🧪 Testing RPC Functions Against Local Database\n')
  console.log(`Database URL: ${supabaseUrl}`)
  console.log('=' .repeat(60))
  
  const results = {
    passed: [],
    failed: [],
    total: 0
  }

  // Test 1: get_properties_within_radius
  console.log('\n📍 Testing: get_properties_within_radius')
  try {
    const { data, error } = await supabase.rpc('get_properties_within_radius', {
      center_lat: 37.7749,
      center_lng: -122.4194,
      radius_km: 5,
      result_limit: 10
    })
    
    if (error) throw error
    
    console.log(`  ✅ Success - Returned ${data?.length || 0} properties`)
    results.passed.push('get_properties_within_radius')
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.failed.push(`get_properties_within_radius: ${error.message}`)
  }
  results.total++

  // Test 2: calculate_distance
  console.log('\n📏 Testing: calculate_distance')
  try {
    const { data, error } = await supabase.rpc('calculate_distance', {
      lat1: 37.7749,
      lng1: -122.4194,
      lat2: 37.7849,
      lng2: -122.4094
    })
    
    if (error) throw error
    
    const distance = data
    console.log(`  ✅ Success - Distance: ${distance?.toFixed(2) || 0} km`)
    
    if (distance < 1 || distance > 2) {
      console.log(`  ⚠️  Warning: Distance seems incorrect (expected ~1.4km)`)
    }
    
    results.passed.push('calculate_distance')
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.failed.push(`calculate_distance: ${error.message}`)
  }
  results.total++

  // Test 3: get_neighborhood_stats
  console.log('\n📊 Testing: get_neighborhood_stats')
  try {
    const { data, error } = await supabase.rpc('get_neighborhood_stats', {
      neighborhood_uuid: '00000000-0000-0000-0000-000000000000'
    })
    
    if (error) throw error
    
    console.log(`  ✅ Success - Result: ${data ? 'Data returned' : 'NULL (expected for fake UUID)'}`)
    results.passed.push('get_neighborhood_stats')
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.failed.push(`get_neighborhood_stats: ${error.message}`)
  }
  results.total++

  // Test 4: get_properties_in_bounds
  console.log('\n🗺️  Testing: get_properties_in_bounds')
  try {
    const { data, error } = await supabase.rpc('get_properties_in_bounds', {
      north_lat: 37.8,
      south_lat: 37.7,
      east_lng: -122.3,
      west_lng: -122.5,
      result_limit: 10
    })
    
    if (error) throw error
    
    console.log(`  ✅ Success - Returned ${data?.length || 0} properties`)
    results.passed.push('get_properties_in_bounds')
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.failed.push(`get_properties_in_bounds: ${error.message}`)
  }
  results.total++

  // Test 5: get_walkability_score
  console.log('\n🚶 Testing: get_walkability_score')
  try {
    const { data, error } = await supabase.rpc('get_walkability_score', {
      center_lat: 37.7749,
      center_lng: -122.4194
    })
    
    if (error) throw error
    
    console.log(`  ✅ Success - Score: ${data || 0}`)
    results.passed.push('get_walkability_score')
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.failed.push(`get_walkability_score: ${error.message}`)
  }
  results.total++

  // Test 6: get_transit_score
  console.log('\n🚇 Testing: get_transit_score')
  try {
    const { data, error } = await supabase.rpc('get_transit_score', {
      center_lat: 37.7749,
      center_lng: -122.4194
    })
    
    if (error) throw error
    
    console.log(`  ✅ Success - Score: ${data || 0}`)
    results.passed.push('get_transit_score')
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.failed.push(`get_transit_score: ${error.message}`)
  }
  results.total++

  // Test 7: get_market_trends
  console.log('\n📈 Testing: get_market_trends')
  try {
    const { data, error } = await supabase.rpc('get_market_trends', {
      timeframe: 'monthly',
      months_back: 6
    })
    
    if (error) throw error
    
    console.log(`  ✅ Success - Returned ${data?.length || 0} data points`)
    results.passed.push('get_market_trends')
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.failed.push(`get_market_trends: ${error.message}`)
  }
  results.total++

  // Test 8: get_similar_properties
  console.log('\n🏠 Testing: get_similar_properties')
  try {
    const { data, error } = await supabase.rpc('get_similar_properties', {
      target_property_id: '00000000-0000-0000-0000-000000000000',
      radius_km: 5,
      result_limit: 10
    })
    
    if (error) throw error
    
    console.log(`  ✅ Success - Returned ${data?.length || 0} similar properties`)
    results.passed.push('get_similar_properties')
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`)
    results.failed.push(`get_similar_properties: ${error.message}`)
  }
  results.total++

  // Summary
  console.log('\n' + '=' .repeat(60))
  console.log('📊 Test Summary:')
  console.log(`  Total Tests: ${results.total}`)
  console.log(`  ✅ Passed: ${results.passed.length}`)
  console.log(`  ❌ Failed: ${results.failed.length}`)
  console.log(`  Success Rate: ${((results.passed.length / results.total) * 100).toFixed(1)}%`)
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:')
    results.failed.forEach(failure => {
      console.log(`  - ${failure}`)
    })
  }
  
  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0)
}

// Run tests
testRPCFunctions().catch(console.error)