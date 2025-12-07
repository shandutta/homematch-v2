import { NextRequest, NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/server'

interface HealthResponse {
  status: string
  timestamp: string
  service: string
  version: string
  database?: string
  database_error?: string
}

// Explicitly handle non-GET methods to avoid hanging requests in tests/E2E
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function GET(_request: NextRequest) {
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
      const supabase = createApiClient()
      const { error: dbError } = await supabase
        .from('user_property_interactions')
        .select('id')
        .limit(1)
        .single()

      if (dbError) {
        throw dbError
      }

      response.database = 'connected'
    } catch (dbError) {
      response.database = 'error'
      const dbMessage =
        dbError instanceof Error
          ? dbError.message
          : typeof (dbError as { message?: unknown })?.message === 'string'
            ? (dbError as { message: string }).message
            : typeof dbError === 'string'
              ? dbError
              : 'Unknown database error'
      response.database_error = dbMessage
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
