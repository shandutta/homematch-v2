import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    IS_TEST: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1'),
  })
}