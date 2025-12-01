import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface HealthResponse {
  status: string
  timestamp: string
  service: string
  version: string
  database?: string
  database_error?: string
}

export async function GET() {
  try {
    // Basic health check
    const response: HealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'HomeMatch V2',
      version: '2.0.0',
    }

    // Test database connectivity
    try {
      const supabase = await createClient()
      const query = supabase.from('properties').select('id').limit(1)

      // Prefer maybeSingle to avoid false negatives on empty tables; fall back for older clients/mocks
      const hasMaybeSingle = typeof query.maybeSingle === 'function'
      const hasSingle = typeof query.single === 'function'

      if (!hasMaybeSingle && !hasSingle) {
        throw new Error('Health check query does not support single-row fetch')
      }

      const { error } = hasMaybeSingle
        ? await query.maybeSingle()
        : await query.single()

      // maybeSingle returns null (not error) when no rows exist
      // Only throw on actual database errors, not empty tables
      if (error) {
        throw new Error(`Database connectivity test failed: ${error.message}`)
      }

      response.database = 'connected'
    } catch (dbError) {
      response.database = 'error'
      response.database_error =
        dbError instanceof Error ? dbError.message : 'Unknown database error'
    }

    // Determine overall health status
    const isHealthy = response.database === 'connected'

    return NextResponse.json(response, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'HomeMatch V2',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
