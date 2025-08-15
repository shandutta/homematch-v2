const {createClient} = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:54321';
// Use the actual service role key from supabase status
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.pmctc3-i5D7PRVq4HOXcXDZ0Er3mrC8a2W7yIa5jePI';

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