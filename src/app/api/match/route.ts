import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ApiErrorHandler } from '@/lib/api/errors'
import { match } from '@/lib/llm/matcher'

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

  try {
    // Mock mode by default; LLM mode requires LLM_ENABLED=true and a wired
    // client. The route does not bind a real client yet — that lands in a
    // follow-up so we can keep this endpoint safe-by-default.
    const result = await match(body)
    return NextResponse.json(
      { data: result, success: true },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return ApiErrorHandler.fromZodError(error)
    }
    return ApiErrorHandler.serverError(
      error instanceof Error ? error.message : 'Match failed'
    )
  }
}
