'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') || '/dashboard'

    if (code) {
        const supabase = await createClient()

        // Exchange code for session
        // The server-side client has proper cookie handling
        await supabase.auth.exchangeCodeForSession(code)
    }

    // Redirect to the next URL or dashboard
    return NextResponse.redirect(new URL(next, requestUrl.origin))
}
