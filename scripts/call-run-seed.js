/**
 * Call Supabase RPC run_seed via PostgREST using the service role key.
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.remote-test
 * Verifies seeded rows afterwards.
 *
 * Usage:
 *   node -r dotenv/config scripts/call-run-seed.js
 * with env: DOTENV_CONFIG_PATH=.env.local.remote-test
 *
 * Example:
 *   DOTENV_CONFIG_PATH=.env.local.remote-test node -r dotenv/config scripts/call-run-seed.js
 */
(async () => {
  try {
    // Ensure fetch in Node
    const fetchImpl = global.fetch ?? (await import('node-fetch')).default;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !service) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }

    const baseUrl = url.replace(/\/+$/, '');
    const rpcEndpoint = baseUrl + '/rest/v1/rpc/run_seed';
    const restBase = baseUrl + '/rest/v1';

    console.log('POST', rpcEndpoint);
    const res = await fetchImpl(rpcEndpoint, {
      method: 'POST',
      headers: {
        apikey: service,
        Authorization: 'Bearer ' + service,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Prefer: 'tx=commit,return=minimal',
      },
      body: '{}',
    });

    const bodyText = await res.text();
    if (!res.ok) {
      console.error('RPC failed:', res.status, res.statusText, bodyText);
      process.exit(2);
    }
    console.log('RPC run_seed OK');

    // Verify via REST
    const verify1 = await fetchImpl(
      restBase +
        '/user_profiles?email=in.(test.user1@example.com,test.user2@example.com)',
      {
        headers: {
          apikey: service,
          Authorization: 'Bearer ' + service,
          Accept: 'application/json',
        },
      }
    );
    const upText = await verify1.text();
    console.log('user_profiles:', upText);

    const verify2 = await fetchImpl(
      restBase +
        '/properties?title=in.(Test%20Property%20A,Test%20Property%20B)',
      {
        headers: {
          apikey: service,
          Authorization: 'Bearer ' + service,
          Accept: 'application/json',
        },
      }
    );
    const propsText = await verify2.text();
    console.log('properties:', propsText);

    process.exit(0);
  } catch (e) {
    console.error('Unexpected:', e?.message || e);
    process.exit(5);
  }
})();
