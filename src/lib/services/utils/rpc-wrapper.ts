/**
 * Generic RPC Wrapper Utility
 *
 * Provides a reusable, type-safe wrapper for Supabase RPC function calls.
 * Reduces code duplication and standardizes error handling across services.
 *
 * Features:
 * - Type-safe RPC calls with proper parameter and return type inference
 * - Standardized error handling with operation context
 * - Optional caching support with configurable TTL
 * - Logging and debugging support
 * - Fallback value handling for different return types
 *
 * @example Basic Usage
 * ```typescript
 * // Instead of this repetitive pattern:
 * const rpc = createTypedRPC(supabase)
 * const { data, error } = await rpc.get_properties_within_radius(params)
 * if (error) {
 *   this.handleSupabaseError(error, 'getPropertiesWithinRadius', { params })
 * }
 * return data || []
 *
 * // Use this concise wrapper:
 * return callArrayRPC(
 *   supabase,
 *   'get_properties_within_radius',
 *   params,
 *   {
 *     operation: 'getPropertiesWithinRadius',
 *     errorContext: { params },
 *     cache: { enabled: true, ttl: 2 * 60 * 1000 }
 *   }
 * )
 * ```
 *
 * @example Usage Patterns
 * ```typescript
 * // For arrays (automatically returns [] on error):
 * const properties = await callArrayRPC(supabase, 'get_properties_in_bounds', params, options)
 *
 * // For single objects (automatically returns null on error):
 * const result = await callSingleRPC(supabase, 'get_neighborhood_stats', params, options)
 *
 * // For numbers with custom fallback:
 * const score = await callNumericRPC(supabase, 'get_walkability_score', params, {
 *   ...options,
 *   fallbackValue: 50
 * })
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  createTypedRPC,
  type TypedSupabaseRPC,
  type RPCResponse,
} from '@/lib/services/supabase-rpc-types'
import { LRUCache } from 'lru-cache'

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

interface CacheOptions {
  /** Enable caching for this RPC call */
  enabled: boolean
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number
  /** Maximum cache entries (default: 1000) */
  maxSize?: number
  /** Custom cache key function */
  keyFn?: (functionName: string, params: unknown) => string
}

// Global cache instance for RPC results
const rpcCache = new LRUCache({
  max: 1000,
  ttl: 5 * 60 * 1000, // 5 minutes default
})

// ============================================================================
// RPC WRAPPER OPTIONS
// ============================================================================

interface RPCWrapperOptions<T> {
  /** Operation name for error context and logging */
  operation: string
  /** Fallback value to return on error */
  fallbackValue: T
  /** Cache configuration */
  cache?: CacheOptions
  /** Additional context for error handling */
  errorContext?: Record<string, unknown>
  /** Enable debug logging */
  enableLogging?: boolean
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Handles RPC errors with standardized context and logging
 */
function handleRPCError(
  error: unknown,
  operation: string,
  functionName: string,
  params: unknown,
  context?: Record<string, unknown>
): never {
  const errorContext = {
    function: functionName,
    params,
    ...context,
  }

  // Check if it's a Supabase error with proper structure
  if (error && typeof error === 'object' && 'message' in error) {
    const supabaseError = error as {
      message: string
      code?: string
      details?: string
    }

    // Log the error for debugging
    console.error(`[RPC Error] ${operation}:`, {
      function: functionName,
      error: supabaseError.message,
      code: supabaseError.code,
      details: supabaseError.details,
      context: errorContext,
    })

    // Create a structured error
    const structuredError = new Error(
      `${operation} failed: ${supabaseError.message}`
    ) as Error & {
      code?: string
      details?: string
      context?: Record<string, unknown>
    }
    structuredError.code = supabaseError.code
    structuredError.details = supabaseError.details
    structuredError.context = errorContext
    throw structuredError
  }

  // Handle other error types
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  console.error(`[RPC Error] ${operation}:`, {
    function: functionName,
    error: errorMessage,
    context: errorContext,
  })

  const structuredError = new Error(
    `${operation} failed: ${errorMessage}`
  ) as Error & {
    context?: Record<string, unknown>
  }
  structuredError.context = errorContext
  throw structuredError
}

// ============================================================================
// CACHE UTILITIES
// ============================================================================

/**
 * Generates a cache key for RPC calls
 */
function generateCacheKey(functionName: string, params: unknown): string {
  try {
    const paramsStr = JSON.stringify(
      params,
      Object.keys(params as object).sort()
    )
    return `rpc:${functionName}:${Buffer.from(paramsStr).toString('base64').slice(0, 32)}`
  } catch {
    // Fallback for non-serializable params
    return `rpc:${functionName}:${Date.now()}`
  }
}

/**
 * Gets cached result if available
 */
function getCachedResult<T>(cacheKey: string): T | undefined {
  const cached = rpcCache.get(cacheKey)
  return cached as T | undefined
}

/**
 * Sets cache result
 */
function setCachedResult<T>(cacheKey: string, result: T, ttl?: number): void {
  if (ttl) {
    rpcCache.set(cacheKey, result as object, { ttl })
  } else {
    rpcCache.set(cacheKey, result as object)
  }
}

// ============================================================================
// CORE RPC WRAPPER FUNCTION
// ============================================================================

/**
 * Generic RPC wrapper that handles the common pattern of:
 * 1. Creating typed RPC client
 * 2. Calling RPC function
 * 3. Handling errors
 * 4. Processing results with optional caching
 */
export async function callRPC<
  TFunctionName extends keyof TypedSupabaseRPC,
  TParams extends Parameters<TypedSupabaseRPC[TFunctionName]>[0],
  TReturn,
>(
  supabase: SupabaseClient<Database>,
  functionName: TFunctionName,
  params: TParams,
  options: RPCWrapperOptions<TReturn>
): Promise<TReturn> {
  const { operation, fallbackValue, cache, errorContext, enableLogging } =
    options

  // Generate cache key if caching is enabled
  let cacheKey: string | undefined
  if (cache?.enabled) {
    cacheKey = cache.keyFn
      ? cache.keyFn(functionName as string, params)
      : generateCacheKey(functionName as string, params)

    // Check cache first
    const cached = getCachedResult<TReturn>(cacheKey)
    if (cached !== undefined) {
      if (enableLogging) {
        console.debug(`[RPC Cache Hit] ${operation}:`, {
          function: functionName,
          params,
        })
      }
      return cached
    }
  }

  try {
    // Log the call if debugging is enabled
    if (enableLogging) {
      console.debug(`[RPC Call] ${operation}:`, {
        function: functionName,
        params,
      })
    }

    // Create typed RPC client and call function
    const rpc = createTypedRPC(supabase)
    const rpcFunction = rpc[functionName] as (
      params: TParams
    ) => Promise<RPCResponse<TReturn>>
    const { data, error } = await rpcFunction(params)

    // Handle RPC errors
    if (error) {
      handleRPCError(
        error,
        operation,
        functionName as string,
        params,
        errorContext
      )
    }

    // Use fallback if data is null/undefined
    const result = data ?? fallbackValue

    // Cache the result if caching is enabled
    if (cache?.enabled && cacheKey) {
      setCachedResult(cacheKey, result, cache.ttl)
    }

    if (enableLogging) {
      console.debug(`[RPC Success] ${operation}:`, {
        function: functionName,
        resultType: typeof result,
      })
    }

    return result
  } catch (error) {
    // If it's already a structured error from handleRPCError, re-throw it
    if (error instanceof Error && 'context' in error) {
      throw error
    }

    // Handle unexpected errors
    handleRPCError(
      error,
      operation,
      functionName as string,
      params,
      errorContext
    )
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS FOR COMMON PATTERNS
// ============================================================================

/**
 * Wrapper for RPC calls that return arrays
 * Automatically provides empty array as fallback
 */
export async function callArrayRPC<
  TFunctionName extends keyof TypedSupabaseRPC,
  TParams extends Parameters<TypedSupabaseRPC[TFunctionName]>[0],
  TReturn extends unknown[],
>(
  supabase: SupabaseClient<Database>,
  functionName: TFunctionName,
  params: TParams,
  options: Omit<RPCWrapperOptions<TReturn>, 'fallbackValue'>
): Promise<TReturn> {
  return callRPC(supabase, functionName, params, {
    ...options,
    fallbackValue: [] as unknown as TReturn,
  })
}

/**
 * Wrapper for RPC calls that return single objects/values
 * Automatically provides null as fallback
 */
export async function callSingleRPC<
  TFunctionName extends keyof TypedSupabaseRPC,
  TParams extends Parameters<TypedSupabaseRPC[TFunctionName]>[0],
  TReturn,
>(
  supabase: SupabaseClient<Database>,
  functionName: TFunctionName,
  params: TParams,
  options: Omit<RPCWrapperOptions<TReturn>, 'fallbackValue'>
): Promise<TReturn | null> {
  return callRPC(supabase, functionName, params, {
    ...options,
    fallbackValue: null as TReturn | null,
  })
}

/**
 * Wrapper for RPC calls that return numbers with fallback
 */
export async function callNumericRPC<
  TFunctionName extends keyof TypedSupabaseRPC,
  TParams extends Parameters<TypedSupabaseRPC[TFunctionName]>[0],
>(
  supabase: SupabaseClient<Database>,
  functionName: TFunctionName,
  params: TParams,
  options: Omit<RPCWrapperOptions<number>, 'fallbackValue'> & {
    fallbackValue?: number
  }
): Promise<number> {
  return callRPC(supabase, functionName, params, {
    ...options,
    fallbackValue: options.fallbackValue ?? 0,
  })
}

// ============================================================================
// BATCH RPC OPERATIONS
// ============================================================================

interface BatchRPCCall<TReturn> {
  functionName: keyof TypedSupabaseRPC
  params: unknown
  options: RPCWrapperOptions<TReturn>
}

/**
 * Execute multiple RPC calls in parallel with individual error handling
 */
export async function callBatchRPC(
  supabase: SupabaseClient<Database>,
  calls: BatchRPCCall<unknown>[]
): Promise<unknown[]> {
  const promises = calls.map(async ({ functionName, params, options }) => {
    try {
      return await callRPC(
        supabase,
        functionName,
        params as Parameters<TypedSupabaseRPC[keyof TypedSupabaseRPC]>[0],
        options
      )
    } catch (error) {
      console.warn(
        `Batch RPC call failed for ${functionName as string}:`,
        error
      )
      return options.fallbackValue
    }
  })

  return Promise.all(promises)
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Clear all cached RPC results
 */
export function clearRPCCache(): void {
  rpcCache.clear()
}

/**
 * Clear cache for specific pattern
 */
export function clearRPCCachePattern(pattern: string): void {
  const keys = Array.from(rpcCache.keys())
  keys
    .filter((key) => key.toString().includes(pattern))
    .forEach((key) => {
      rpcCache.delete(key)
    })
}

/**
 * Get cache statistics
 */
export function getRPCCacheStats(): {
  size: number
  max: number
  calculatedSize: number
} {
  return {
    size: rpcCache.size,
    max: rpcCache.max,
    calculatedSize: rpcCache.calculatedSize,
  }
}
