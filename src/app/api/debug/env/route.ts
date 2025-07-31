export async function GET() {
  return Response.json({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? '***PROVIDED***'
      : 'MISSING',
    isTest: process.env.NODE_ENV === 'test',
  })
}
