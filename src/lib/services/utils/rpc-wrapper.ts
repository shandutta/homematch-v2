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
import type { AppDatabase } from '@/types/app-database'
import {
  createTypedRPC,
  type TypedSupabaseRPC,
  type RPCResponse,
} from '@/lib/services/supabase-rpc-types'
import { LRUCache } from 'lru-cache'

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

interface CacheOptions<T> {
  /** Enable caching for this RPC call */
  enabled: boolean
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number
  /** Maximum cache entries (default: 1000) */
  maxSize?: number
  /** Custom cache key function */
  keyFn?: (functionName: string, params: unknown) => string
  /** Optional validator to safely reuse cached results */
  validate?: (value: unknown) => value is T
}

type RpcCacheValue = object

// Global cache instance for RPC results
const rpcCache = new LRUCache<string, RpcCacheValue>({
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
  cache?: CacheOptions<T>
  /** Additional context for error handling */
  errorContext?: Record<string, unknown>
  /** Enable debug logging */
  enableLogging?: boolean
}

type RPCResultValue<TFunctionName extends keyof TypedSupabaseRPC> =
  Awaited<ReturnType<TypedSupabaseRPC[TFunctionName]>> extends RPCResponse<
    infer TResult
  >
    ? TResult
    : never

type RPCArrayResult<TFunctionName extends keyof TypedSupabaseRPC> =
  RPCResultValue<TFunctionName> extends Array<infer TItem> ? TItem[] : never

const coalesce = <T>(value: T | null | undefined, fallback: T): T =>
  value ?? fallback

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
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

  const errorContext = {
    function: functionName,
    params,
    ...context,
  }

  // Check if it's a Supabase error with proper structure
  if (isRecord(error) && typeof error.message === 'string') {
    const supabaseError = {
      message: error.message,
      code: typeof error.code === 'string' ? error.code : undefined,
      details: typeof error.details === 'string' ? error.details : undefined,
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
    const structuredError = Object.assign(
      new Error(`${operation} failed: ${supabaseError.message}`),
      {
        code: supabaseError.code,
        details: supabaseError.details,
        context: errorContext,
      }
    )
    throw structuredError
  }

  // Handle other error types
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  console.error(`[RPC Error] ${operation}:`, {
    function: functionName,
    error: errorMessage,
    context: errorContext,
  })

  const structuredError = Object.assign(
    new Error(`${operation} failed: ${errorMessage}`),
    {
      context: errorContext,
    }
  )
  throw structuredError
}

// ============================================================================
// CACHE UTILITIES
// ============================================================================

/**
 * Generates a cache key for RPC calls
 */
function generateCacheKey(functionName: string, params: unknown): string {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

  try {
    const paramsObject = isRecord(params) ? params : {}
    const paramsStr = JSON.stringify(
      paramsObject,
      Object.keys(paramsObject).sort()
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
function getCachedResult(cacheKey: string): unknown {
  return rpcCache.get(cacheKey)
}

/**
 * Sets cache result
 */
function setCachedResult<T>(cacheKey: string, result: T, ttl?: number): void {
  const cacheValue = result as unknown as RpcCacheValue
  if (ttl) {
    rpcCache.set(cacheKey, cacheValue, { ttl })
  } else {
    rpcCache.set(cacheKey, cacheValue)
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
  TReturn = RPCResultValue<TFunctionName>,
>(
  supabase: SupabaseClient<AppDatabase>,
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
      ? cache.keyFn(String(functionName), params)
      : generateCacheKey(String(functionName), params)

    // Check cache first
    const cached = getCachedResult(cacheKey)
    if (cached !== undefined && cache?.validate && cache.validate(cached)) {
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
    ) => Promise<RPCResponse<unknown>>
    const { data, error } = await rpcFunction(params)

    // Handle RPC errors
    if (error) {
      handleRPCError(
        error,
        operation,
        String(functionName),
        params,
        errorContext
      )
    }

    // Use fallback if data is null/undefined
    const result = coalesce(data, fallbackValue) as TReturn

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

    return result as TReturn
  } catch (error) {
    // If it's already a structured error from handleRPCError, re-throw it
    if (error instanceof Error && 'context' in error) {
      throw error
    }

    // Handle unexpected errors
    handleRPCError(error, operation, String(functionName), params, errorContext)
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
>(
  supabase: SupabaseClient<AppDatabase>,
  functionName: TFunctionName,
  params: TParams,
  options: Omit<
    RPCWrapperOptions<RPCArrayResult<TFunctionName>>,
    'fallbackValue'
  >
): Promise<RPCArrayResult<TFunctionName>> {
  const emptyFallback = [] as unknown as RPCArrayResult<TFunctionName>
  return callRPC<TFunctionName, TParams, RPCArrayResult<TFunctionName>>(
    supabase,
    functionName,
    params,
    {
      ...options,
      fallbackValue: emptyFallback,
    }
  )
}

/**
 * Wrapper for RPC calls that return single objects/values
 * Automatically provides null as fallback
 */
export async function callSingleRPC<
  TFunctionName extends keyof TypedSupabaseRPC,
  TParams extends Parameters<TypedSupabaseRPC[TFunctionName]>[0],
>(
  supabase: SupabaseClient<AppDatabase>,
  functionName: TFunctionName,
  params: TParams,
  options: Omit<
    RPCWrapperOptions<RPCResultValue<TFunctionName> | null>,
    'fallbackValue'
  >
): Promise<RPCResultValue<TFunctionName> | null> {
  return callRPC<TFunctionName, TParams, RPCResultValue<TFunctionName> | null>(
    supabase,
    functionName,
    params,
    {
      ...options,
      fallbackValue: null,
    }
  )
}

/**
 * Wrapper for RPC calls that return numbers with fallback
 */
export async function callNumericRPC<
  TFunctionName extends keyof TypedSupabaseRPC,
  TParams extends Parameters<TypedSupabaseRPC[TFunctionName]>[0],
>(
  supabase: SupabaseClient<AppDatabase>,
  functionName: TFunctionName,
  params: TParams,
  options: Omit<RPCWrapperOptions<number>, 'fallbackValue'> & {
    fallbackValue?: number
  }
): Promise<number> {
  return callRPC<TFunctionName, TParams, number>(
    supabase,
    functionName,
    params,
    {
      ...options,
      fallbackValue: options.fallbackValue ?? 0,
    }
  )
}

// ============================================================================
// BATCH RPC OPERATIONS
// ============================================================================

type BatchRPCCall<K extends keyof TypedSupabaseRPC = keyof TypedSupabaseRPC> = {
  functionName: K
  params: Parameters<TypedSupabaseRPC[K]>[0]
  options: RPCWrapperOptions<RPCResultValue<K>>
}

/**
 * Execute multiple RPC calls in parallel with individual error handling
 */
export async function callBatchRPC(
  supabase: SupabaseClient<AppDatabase>,
  calls: BatchRPCCall[]
): Promise<unknown[]> {
  const executeCall = async <K extends keyof TypedSupabaseRPC>(
    call: BatchRPCCall<K>
  ) => callRPC(supabase, call.functionName, call.params, call.options)

  const promises = calls.map(async (call) => {
    try {
      return await executeCall(call)
    } catch (error) {
      console.warn(
        `Batch RPC call failed for ${String(call.functionName)}:`,
        error
      )
      return call.options.fallbackValue
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
