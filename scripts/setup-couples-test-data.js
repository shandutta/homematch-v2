/**
 * Setup couples test data for comprehensive testing
 * Creates test users with households and property interactions for mutual likes
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.test.local') })

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found')
  process.exit(1)
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const couples = [
  {
    household: {
      id: '12340001-1234-1234-1234-123456789abc',
      name: 'The Johnsons',
      collaboration_mode: 'shared',
    },
    users: [
      {
        email: 'michael.johnson@test.com',
        password: 'password123',
        display_name: 'Michael Johnson',
        bio: 'Software engineer looking for our first home together',
      },
      {
        email: 'sarah.johnson@test.com',
        password: 'password123',
        display_name: 'Sarah Johnson',
        bio: 'Marketing manager excited to find the perfect place',
      },
    ],
  },
  {
    household: {
      id: '12340002-1234-1234-1234-123456789abc',
      name: 'The Martinez Family',
      collaboration_mode: 'weighted',
    },
    users: [
      {
        email: 'carlos.martinez@test.com',
        password: 'password123',
        display_name: 'Carlos Martinez',
        bio: 'Looking for a family home with good schools',
      },
      {
        email: 'ana.martinez@test.com',
        password: 'password123',
        display_name: 'Ana Martinez',
        bio: 'Need space for our growing family',
      },
    ],
  },
]

// Properties that will have mutual likes
const mutualLikeProperties = [
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Test property 1
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Test property 2
  'cccccccc-cccc-cccc-cccc-cccccccccccc', // Test property 3
]

async function setupCouplesTestData() {
  console.log('🏠 Setting up couples test data...')

  try {
    // Check if households already exist
    const { data: existingHouseholds } = await supabase
      .from('households')
      .select('*')

    console.log(
      `✅ Found ${existingHouseholds?.length || 0} existing households`
    )

    // Create couples and their interactions
    for (const couple of couples) {
      console.log(`\n👫 Setting up couple: ${couple.household.name}`)

      // Create users for this couple
      const createdUsers = []

      for (const userData of couple.users) {
        try {
          // Delete existing user if any
          const { data: users } = await supabase.auth.admin.listUsers()
          const existingUser = users?.users?.find(
            (u) => u.email === userData.email
          )

          if (existingUser) {
            await supabase.auth.admin.deleteUser(existingUser.id)
            console.log(`🗑️  Deleted existing user ${userData.email}`)
          }

          // Create new user
          const { data: newUser, error } = await supabase.auth.admin.createUser(
            {
              email: userData.email,
              password: userData.password,
              email_confirm: true,
              user_metadata: {
                test_user: true,
                display_name: userData.display_name,
              },
            }
          )

          if (error) throw error

          console.log(`✅ Created user: ${userData.email} (${newUser.user.id})`)

          // Wait for trigger to create profile
          await new Promise((resolve) => setTimeout(resolve, 1000))

          // Update user profile with household and additional data
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({
              household_id: couple.household.id,
              preferences: {
                display_name: userData.display_name,
                bio: userData.bio,
                min_price: 800000,
                max_price: 2000000,
                min_bedrooms: 2,
                max_bedrooms: 4,
                property_types: ['house', 'condo'],
              },
            })
            .eq('id', newUser.user.id)

          if (profileError) throw profileError

          createdUsers.push({
            id: newUser.user.id,
            email: userData.email,
            display_name: userData.display_name,
          })
        } catch (error) {
          console.error(
            `❌ Error creating user ${userData.email}:`,
            error.message
          )
        }
      }

      // Create mutual likes - both users like the same properties
      if (createdUsers.length === 2) {
        console.log(`💝 Creating mutual likes for ${couple.household.name}`)

        for (let i = 0; i < mutualLikeProperties.length; i++) {
          const propertyId = mutualLikeProperties[i]

          // User 1 likes the property first
          const { error: like1Error } = await supabase
            .from('user_property_interactions')
            .insert({
              user_id: createdUsers[0].id,
              property_id: propertyId,
              household_id: couple.household.id,
              interaction_type: 'like',
              created_at: new Date(
                Date.now() - (i + 1) * 24 * 60 * 60 * 1000
              ).toISOString(), // Spread over days
            })

          if (like1Error) {
            console.error(
              `❌ Error creating like for user 1:`,
              like1Error.message
            )
          }

          // User 2 likes the same property later (creates mutual like)
          await new Promise((resolve) => setTimeout(resolve, 100))

          const { error: like2Error } = await supabase
            .from('user_property_interactions')
            .insert({
              user_id: createdUsers[1].id,
              property_id: propertyId,
              household_id: couple.household.id,
              interaction_type: 'like',
              created_at: new Date(
                Date.now() - i * 12 * 60 * 60 * 1000
              ).toISOString(), // Different timing
            })

          if (like2Error) {
            console.error(
              `❌ Error creating like for user 2:`,
              like2Error.message
            )
          } else {
            console.log(
              `   ✅ Mutual like created for property ${propertyId.slice(0, 8)}`
            )
          }
        }

        // Add some individual likes (non-mutual)
        const additionalProperties = [
          'dddddddd-dddd-dddd-dddd-dddddddddddd',
          'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        ]

        for (const propertyId of additionalProperties) {
          // Only user 1 likes these
          const { error } = await supabase
            .from('user_property_interactions')
            .insert({
              user_id: createdUsers[0].id,
              property_id: propertyId,
              household_id: couple.household.id,
              interaction_type: 'like',
              created_at: new Date().toISOString(),
            })

          if (error) {
            console.error(`❌ Error creating individual like:`, error.message)
          }
        }

        console.log(`   ✅ Created individual likes for contrast`)
      }
    }

    // Verify mutual likes were created
    console.log('\n🔍 Verifying mutual likes...')

    for (const couple of couples) {
      const { data: mutualLikes, error } = await supabase.rpc(
        'get_household_mutual_likes',
        {
          p_household_id: couple.household.id,
        }
      )

      if (error) {
        console.error(
          `❌ Error checking mutual likes for ${couple.household.name}:`,
          error.message
        )
      } else {
        console.log(
          `   ✅ ${couple.household.name}: ${mutualLikes?.length || 0} mutual likes`
        )
      }
    }

    console.log('\n🎉 Couples test data setup complete!')
    console.log('\n📝 Test Login Credentials:')
    console.log('👫 The Johnsons:')
    console.log('   michael.johnson@test.com / password123')
    console.log('   sarah.johnson@test.com / password123')
    console.log('\n👨‍👩‍👧‍👦 The Martinez Family:')
    console.log('   carlos.martinez@test.com / password123')
    console.log('   ana.martinez@test.com / password123')
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

setupCouplesTestData()
