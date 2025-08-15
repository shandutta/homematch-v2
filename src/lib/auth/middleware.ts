import { NextRequest, NextResponse } from 'next/server'

/**
 * Auth middleware for API routes
 * Provides authentication wrapper for protected API endpoints
 */

export type AuthenticatedRequest = NextRequest & {
  userId?: string
}

export type AuthHandler<T = unknown> = (
  request: AuthenticatedRequest
) => Promise<NextResponse<T>> | NextResponse<T>

/**
 * Middleware wrapper that adds authentication to API routes
 * In tests, this is mocked to pass through the handler directly
 * In production, this would extract user ID from session/JWT
 */
export function withAuth<T = unknown>(handler: AuthHandler<T>): AuthHandler<T> {
  return async (request: AuthenticatedRequest) => {
    // In production, extract user ID from session, JWT, etc.
    // For now, mock implementation that passes through
    // This will be properly implemented when auth is set up

    // Mock user ID for development/testing
    request.userId = 'mock-user-id'

    return handler(request)
  }
}
