const {createClient} = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
// Use the actual service role key from supabase status
const supabaseServiceKey = 'REDACTED_SUPABASE_SERVICE_ROLE_KEY';

console.log('URL:', supabaseUrl);
console.log('Testing with correct service role key from supabase status...');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

supabase.auth.admin.listUsers()
  .then(({data, error}) => {
    if (error) throw error;
    console.log('✅ Success! Users:', data.users.length);
  })
  .catch(e => {
    console.log('❌ Error:', e.message || JSON.stringify(e));
    console.log('Full error:', JSON.stringify(e, null, 2));
  });