/**
 * Base Service Class
 *
 * Provides common functionality for all service classes including
 * standardized error handling, validation, and database operations.
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { createClient as createStandaloneClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type {
  IBaseService,
  ISupabaseClientFactory,
  ClientConfig,
} from './interfaces'
import {
  ValidationError,
  handleErrorLegacy,
  mapSupabaseError,
  getErrorHandlingConfig,
  type ErrorHandlingConfig,
} from './errors'

/**
 * Default Supabase client factory
 */
export class DefaultSupabaseClientFactory implements ISupabaseClientFactory {
  async createClient(
    _config?: ClientConfig
  ): Promise<SupabaseClient<Database>> {
    if (typeof window === 'undefined') {
      return await createServerClient()
    }
    return await createBrowserClient()
  }
}

/**
 * Base service class with standardized error handling
 */
export abstract class BaseService implements IBaseService {
  protected readonly clientFactory: ISupabaseClientFactory
  protected readonly config: ErrorHandlingConfig

  constructor(clientFactory?: ISupabaseClientFactory) {
    this.clientFactory = clientFactory || new DefaultSupabaseClientFactory()
    this.config = getErrorHandlingConfig()
  }

  /**
   * Gets a Supabase client instance
   */
  protected async getSupabase(): Promise<SupabaseClient<Database>> {
    // In test environments, prefer service-role to bypass RLS for integration fixtures
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.IS_TEST_ENV === 'true' ||
      process.env.USE_SERVICE_ROLE_FOR_TESTS === 'true'
    ) {
      const url =
      process.env.SUPABASE_LOCAL_PROXY_TARGET ||
        process.env.SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      // If credentials are available, use the standalone client (useful for integration/E2E)
      if (url && serviceKey) {
        return createStandaloneClient<Database>(url, serviceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      }

      // For unit tests (no service role credentials), fall back to injected/mocked client factory
    }

    return this.clientFactory.createClient()
  }

  /**
   * Validates that required parameters are provided
   */
  validateRequired(params: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') {
        throw new ValidationError(`Missing required parameter: ${key}`, {
          params,
        })
      }
    }
  }

  /**
   * Sanitizes input data to prevent injection attacks
   */
  sanitizeInput<T>(input: T): T {
    if (input === null || input === undefined) {
      return input
    }

    if (typeof input === 'string') {
      // Basic SQL injection prevention
      return input.replace(/['"`;\\]/g, '') as T
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeInput(item)) as T
    }

    if (typeof input === 'object') {
      const sanitized = {} as Record<string, unknown>
      for (const [key, value] of Object.entries(input)) {
        // Skip potentially dangerous keys
        if (
          key.toLowerCase().includes('script') ||
          key.toLowerCase().includes('sql')
        ) {
          continue
        }
        sanitized[key] = this.sanitizeInput(value)
      }
      return sanitized as T
    }

    return input
  }

  /**
   * Executes a database query with standardized error handling
   * Maintains backward compatibility while providing new error infrastructure
   */
  async executeQuery<T>(
    operation: string,
    queryFn: (supabase: SupabaseClient<Database>) => Promise<T>
  ): Promise<T> {
    try {
      const supabase = await this.getSupabase()
      const result = await queryFn(supabase)
      return result
    } catch (error) {
      // Handle error in backward-compatible way
      return handleErrorLegacy<T>(operation, error) as T
    }
  }

  /**
   * Executes a query that returns a single item (Property, User, etc.)
   * Returns null on error for backward compatibility
   */
  protected async executeSingleQuery<T>(
    operation: string,
    queryFn: (supabase: SupabaseClient<Database>) => Promise<T>
  ): Promise<T | null> {
    try {
      const supabase = await this.getSupabase()
      return await queryFn(supabase)
    } catch (error) {
      return handleErrorLegacy<T>(operation, error, 'single') as T | null
    }
  }

  /**
   * Executes a query that returns an array of items
   * Returns empty array on error for backward compatibility
   */
  protected async executeArrayQuery<T>(
    operation: string,
    queryFn: (supabase: SupabaseClient<Database>) => Promise<T[]>
  ): Promise<T[]> {
    try {
      const supabase = await this.getSupabase()
      return await queryFn(supabase)
    } catch (error) {
      return handleErrorLegacy<T>(operation, error, 'array') as T[]
    }
  }

  /**
   * Executes a query that returns a boolean result
   * Returns false on error for backward compatibility
   */
  protected async executeBooleanQuery(
    operation: string,
    queryFn: (supabase: SupabaseClient<Database>) => Promise<boolean>
  ): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()
      return await queryFn(supabase)
    } catch (error) {
      handleErrorLegacy(operation, error)
      return false
    }
  }

  /**
   * Handles Supabase errors and converts them to ServiceErrors
   */
  protected handleSupabaseError(
    error: unknown,
    operation: string,
    context?: Record<string, unknown>
  ): never {
    const serviceError = mapSupabaseError(error, operation, context)
    throw serviceError
  }

  /**
   * Checks if error is a "not found" error
   */
  protected isNotFoundError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'PGRST116'
    )
  }

  /**
   * Logs operation for debugging (in development)
   */
  protected logOperation(
    operation: string,
    params?: Record<string, unknown>
  ): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.constructor.name}] ${operation}`, params)
    }
  }
}

/**
 * Decorator for automatic error handling
 * Wraps service methods with standardized error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  operation: string,
  returnType: 'single' | 'array' | 'boolean' = 'single'
) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: T): Promise<R> {
      try {
        return await originalMethod.apply(this, args)
      } catch (error) {
        // Use the same backward-compatible error handling
        const result = handleErrorLegacy(
          operation,
          error,
          returnType as 'single' | 'array'
        )

        if (returnType === 'boolean') {
          return false as R
        }

        return result as R
      }
    }

    return descriptor
  }
}

/**
 * Method decorator for logging method calls
 */
export function logMethodCall() {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: unknown[]) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[${target.constructor.name}] ${propertyKey}`, args)
      }
      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

/**
 * Method decorator for parameter validation
 */
export function validateParams(requiredParams: string[]) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = function (...args: unknown[]) {
      // Simple validation for first argument if it's an object
      if (args.length > 0 && typeof args[0] === 'object') {
        const params = args[0] as Record<string, unknown>
        for (const param of requiredParams) {
          if (params[param] === undefined || params[param] === null) {
            throw new ValidationError(`Missing required parameter: ${param}`)
          }
        }
      }

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}

/**
 * Legacy adapter for gradual migration
 * Wraps old service methods to use new error handling
 */
export class LegacyServiceAdapter {
  /**
   * Wraps a legacy service method with new error handling
   */
  static wrapMethod<T extends unknown[], R>(
    originalMethod: (...args: T) => Promise<R>,
    operation: string,
    returnType: 'single' | 'array' | 'boolean' = 'single'
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await originalMethod(...args)
      } catch (error) {
        const result = handleErrorLegacy(
          operation,
          error,
          returnType as 'single' | 'array'
        )

        if (returnType === 'boolean') {
          return false as R
        }

        return result as R
      }
    }
  }
}
