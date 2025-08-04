import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export type ApiError = {
  error: string
  code?: string
  details?: unknown
}

export type ApiSuccess<T> = {
  data: T
  success: true
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export class ApiErrorHandler {
  static badRequest(message: string, details?: unknown): NextResponse {
    return NextResponse.json(
      { error: message, code: 'BAD_REQUEST', details },
      { status: 400 }
    )
  }

  static unauthorized(message = 'Unauthorized'): NextResponse {
    return NextResponse.json(
      { error: message, code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  static forbidden(message = 'Forbidden'): NextResponse {
    return NextResponse.json(
      { error: message, code: 'FORBIDDEN' },
      { status: 403 }
    )
  }

  static notFound(message = 'Resource not found'): NextResponse {
    return NextResponse.json(
      { error: message, code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  static serverError(message = 'Internal server error', details?: unknown): NextResponse {
    // Log server errors for monitoring
    console.error('Server error:', message, details)
    
    return NextResponse.json(
      { error: message, code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }

  static fromZodError(error: ZodError): NextResponse {
    return this.badRequest('Validation failed', error.flatten())
  }

  static success<T>(data: T): NextResponse {
    return NextResponse.json({ data, success: true })
  }
}