import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ApiErrorHandler } from '@/lib/api/errors'
import { match, type PromptVersion } from '@/lib/llm/matcher'

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}

export async function GET() {
  return ApiErrorHandler.methodNotAllowed()
}

export async function PUT() {
  return ApiErrorHandler.methodNotAllowed()
}

export async function DELETE() {
  return ApiErrorHandler.methodNotAllowed()
}

export async function PATCH() {
  return ApiErrorHandler.methodNotAllowed()
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return ApiErrorHandler.badRequest('Invalid JSON body')
  }

  // Resolve prompt version from ?v= query param.
  // Only "2" opts in to the structured rubric prompt; everything else uses V1.
  const vParam = request.nextUrl.searchParams.get('v')
  const promptVersion: PromptVersion = vParam === '2' ? '2' : '1'

  const startMs = Date.now()

  try {
    // Mock mode by default; LLM mode requires LLM_ENABLED=true and a wired
    // client. The route does not bind a real client yet — that lands in a
    // follow-up so we can keep this endpoint safe-by-default.
    const result = await match(body, { promptVersion })

    const latencyMs = Date.now() - startMs
    // Structured log consumed by the observability pipeline (e.g. Sentry / PostHog).
    console.log(
      JSON.stringify({
        event: 'match.complete',
        prompt_version: promptVersion,
        mode: result.mode,
        model: result.model,
        candidate_count: result.candidate_count,
        returned_count: result.ranked.length,
        latency_ms: latencyMs,
      })
    )

    return NextResponse.json(
      { data: result, success: true },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch (error) {
    const latencyMs = Date.now() - startMs
    console.error(
      JSON.stringify({
        event: 'match.error',
        prompt_version: promptVersion,
        latency_ms: latencyMs,
        error: error instanceof Error ? error.message : String(error),
      })
    )

    if (error instanceof ZodError) {
      return ApiErrorHandler.fromZodError(error)
    }
    return ApiErrorHandler.serverError(
      error instanceof Error ? error.message : 'Match failed'
    )
  }
}
