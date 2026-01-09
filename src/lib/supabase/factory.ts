/**
 * Unified Supabase Client Factory
 *
 * Consolidates all Supabase client creation patterns into a single,
 * environment-aware factory that maintains backward compatibility.
 */

import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppDatabase } from '@/types/app-database'
import {
  ClientContext,
  ClientConfig,
  ISupabaseClientFactory,
} from '@/lib/services/interfaces'

/**
 * Unified factory for creating Supabase clients with environment detection
 * and context-aware configuration.
 */
export class SupabaseClientFactory implements ISupabaseClientFactory {
  private static instance: SupabaseClientFactory
  private clientCache = new Map<string, SupabaseClient<AppDatabase>>()

  private constructor() {}

  static getInstance(): SupabaseClientFactory {
    if (!SupabaseClientFactory.instance) {
      SupabaseClientFactory.instance = new SupabaseClientFactory()
    }
    return SupabaseClientFactory.instance
  }

  /**
   * Main entry point for creating Supabase clients
   * Automatically detects context if not specified
   */ async createClient(
    config?: ClientConfig
  ): Promise<SupabaseClient<AppDatabase>> {
    const context = config?.context || this.detectContext()
    const cacheKey = this.getCacheKey(context, config)

    // Return cached client for stateless contexts
    if (this.shouldCache(context) && this.clientCache.has(cacheKey)) {
      return this.clientCache.get(cacheKey)!
    }

    let client: SupabaseClient<AppDatabase>

    switch (context) {
      case ClientContext.BROWSER:
        client = this.createBrowserClient()
        break
      case ClientContext.SERVER:
        client = await this.createServerClient()
        break
      case ClientContext.API:
        client = this.createApiClient(config?.request)
        break
      case ClientContext.SERVICE:
        client = this.createServiceClient()
        break
      default:
        throw new Error(`Unknown client context: ${context}`)
    }

    // Cache appropriate clients
    if (this.shouldCache(context)) {
      this.clientCache.set(cacheKey, client)
    }

    return client
  }

  /**
   * Browser client for client-side operations
   * Same as current client.ts implementation
   */
  private createBrowserClient(): SupabaseClient<AppDatabase> {
    return createBrowserClient<AppDatabase>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  /**
   * Server client for Server Components and server contexts
   * Based on current server.ts createClient() implementation
   */
  private createServerClientAsync(): SupabaseClient<AppDatabase> {
    // Note: This needs to be async in real implementation
    // For now, we'll handle this in the consumer
    throw new Error('Use createServerClient() for async server contexts')
  }

  /**
   * Async server client for Server Components
   * Handles cookies and headers properly
   */
  async createServerClient(): Promise<SupabaseClient<AppDatabase>> {
    const cookieStore = await cookies()
    const headerStore = await headers()

    // Check for Authorization header (for API routes)
    const authHeader = headerStore.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')

    return createServerClient<AppDatabase>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, {
                  ...options,
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax',
                  maxAge: 60 * 60 * 24 * 7, // 7 days
                  path: '/',
                })
              )
            } catch {
              // Ignore setAll errors from Server Components
            }
          },
        },
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
        global: bearerToken
          ? {
              headers: {
                Authorization: `Bearer ${bearerToken}`,
              },
            }
          : undefined,
      }
    )
  }

  /**
   * API client for API routes with request context
   * Based on current server.ts createApiClient() implementation
   */
  private createApiClient(request?: NextRequest): SupabaseClient<AppDatabase> {
    let authHeader: string | null = null
    let cookieData: { name: string; value: string }[] = []

    if (request) {
      authHeader = request.headers.get('authorization')

      const cookieStr = request.headers.get('cookie')
      if (cookieStr) {
        cookieData = cookieStr
          .split(';')
          .map((c) => {
            const [name, value] = c.trim().split('=')
            return { name, value: decodeURIComponent(value) }
          })
          .filter((c) => c.name && c.value)
      }
    }

    const bearerToken = authHeader?.replace('Bearer ', '')

    return createServerClient<AppDatabase>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieData
          },
          setAll(_cookiesToSet) {
            // API routes handle cookie setting in response
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
        global: bearerToken
          ? {
              headers: {
                Authorization: `Bearer ${bearerToken}`,
              },
            }
          : undefined,
      }
    )
  }

  /**
   * Service role client for administrative operations
   * Based on current server.ts createServiceClient() implementation
   */
  private createServiceClient(): SupabaseClient<AppDatabase> {
    return createServerClient<AppDatabase>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    )
  }

  /**
   * Detects the appropriate client context based on environment
   */
  private detectContext(): ClientContext {
    // Browser environment
    if (typeof window !== 'undefined') {
      return ClientContext.BROWSER
    }

    // Server-side environment
    // Additional detection logic could be added here based on:
    // - Request headers
    // - Environment variables
    // - Execution context

    return ClientContext.SERVER
  }

  /**
   * Generates cache key for client instances
   */
  private getCacheKey(context: ClientContext, config?: ClientConfig): string {
    const parts: string[] = [context]

    if (config?.authToken) {
      parts.push(`auth:${config.authToken.slice(0, 8)}`)
    }

    if (config?.request) {
      parts.push(`req:${config.request.url}`)
    }

    return parts.join('|')
  }

  /**
   * Determines if client should be cached
   */
  private shouldCache(context: ClientContext): boolean {
    return (
      context === ClientContext.BROWSER || context === ClientContext.SERVICE
    )
  }

  /**
   * Clears client cache (useful for testing)
   */
  clearCache(): void {
    this.clientCache.clear()
  }

  /**
   * Gets cache statistics (useful for monitoring)
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.clientCache.size,
      keys: Array.from(this.clientCache.keys()),
    }
  }
}

// ============================================================================
// BACKWARD COMPATIBILITY HELPERS
// ============================================================================

/**
 * Drop-in replacement for existing createClient() calls
 * Maintains exact same API for backward compatibility
 */
export async function createClient(
  config?: ClientConfig
): Promise<SupabaseClient<AppDatabase>> {
  const factory = SupabaseClientFactory.getInstance()
  return await factory.createClient(config)
}

/**
 * Async server client helper
 * For gradual migration from existing server.ts usage
 */
export async function createServerClientCompat(): Promise<
  SupabaseClient<AppDatabase>
> {
  const factory = SupabaseClientFactory.getInstance()
  return factory.createServerClient()
}

/**
 * API client helper
 * For gradual migration from existing API route patterns
 */
export async function createApiClientCompat(
  request?: NextRequest
): Promise<SupabaseClient<AppDatabase>> {
  const factory = SupabaseClientFactory.getInstance()
  return await factory.createClient({
    context: ClientContext.API,
    request,
  })
}

/**
 * Service client helper
 * For gradual migration from existing service client usage
 */
export async function createServiceClientCompat(): Promise<
  SupabaseClient<AppDatabase>
> {
  const factory = SupabaseClientFactory.getInstance()
  return await factory.createClient({
    context: ClientContext.SERVICE,
  })
}

// ============================================================================
// FEATURE FLAG INTEGRATION
// ============================================================================

/**
 * Feature flag aware client factory
 * Allows gradual rollout of new factory
 */
export async function createClientWithFeatureFlag(
  config?: ClientConfig
): Promise<SupabaseClient<AppDatabase>> {
  const useNewFactory = process.env.FEATURE_UNIFIED_CLIENT_FACTORY === 'true'

  if (!useNewFactory) {
    // Fall back to original implementations
    if (typeof window !== 'undefined') {
      // Original client.ts logic
      return createBrowserClient<AppDatabase>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    } else {
      // Would need to import original server functions
      throw new Error('Feature flag fallback not fully implemented')
    }
  }

  return await createClient(config)
}

// ============================================================================
// TESTING UTILITIES
// ============================================================================

/**
 * Test factory for mocking Supabase clients
 */
export class MockSupabaseClientFactory implements ISupabaseClientFactory {
  private mockClient: SupabaseClient<AppDatabase>

  constructor(mockClient: SupabaseClient<AppDatabase>) {
    this.mockClient = mockClient
  }

  async createClient(
    _config?: ClientConfig
  ): Promise<SupabaseClient<AppDatabase>> {
    return this.mockClient
  }

  getInstance(): ISupabaseClientFactory {
    return this
  }
}

/**
 * Creates a test-friendly factory
 */
export function createTestFactory(
  mockClient: SupabaseClient<AppDatabase>
): MockSupabaseClientFactory {
  return new MockSupabaseClientFactory(mockClient)
}
