/**
 * Centralized Error Handling for Services
 *
 * Provides standardized error classes and utilities for consistent
 * error handling across all service layers.
 */

/**
 * Base error class for all service-level errors
 */
export abstract class ServiceError extends Error {
  public readonly code: string
  public readonly context?: Record<string, unknown>
  public readonly timestamp: Date

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.context = context
    this.timestamp = new Date()

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Converts error to a structured object for logging/monitoring
   */
  toLogObject(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    }
  }
}

/**
 * Database operation errors (connection, query, constraint violations)
 */
export class DatabaseError extends ServiceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', context)
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends ServiceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', context)
  }
}

/**
 * Input validation errors
 */
export class ValidationError extends ServiceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context)
  }
}

/**
 * Authentication/authorization errors
 */
export class AuthError extends ServiceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', context)
  }
}

/**
 * Configuration or environment errors
 */
export class ConfigError extends ServiceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', context)
  }
}

/**
 * External service integration errors
 */
export class ExternalServiceError extends ServiceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'EXTERNAL_SERVICE_ERROR', context)
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends ServiceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_ERROR', context)
  }
}

/**
 * Network connectivity errors
 */
export class NetworkError extends ServiceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', context)
  }
}

/**
 * Error severity levels for logging and monitoring
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Configuration for error handling behavior
 */
export interface ErrorHandlingConfig {
  /**
   * Whether to enable new error handling (feature flag)
   */
  enabled: boolean

  /**
   * Whether to log errors to console (backward compatibility)
   */
  logToConsole: boolean

  /**
   * Whether to preserve legacy error messages
   */
  preserveLegacyMessages: boolean

  /**
   * Whether to throw errors or return null/empty arrays
   */
  throwErrors: boolean

  /**
   * Custom logger function
   */
  logger?: (error: ServiceError) => void
}

/**
 * Default error handling configuration
 * Maintains 100% backward compatibility initially
 */
export const DEFAULT_ERROR_CONFIG: ErrorHandlingConfig = {
  enabled: true,
  logToConsole: true,
  preserveLegacyMessages: true,
  throwErrors: false, // Return null/[] for backward compatibility
  logger: undefined,
}

/**
 * Global error handling configuration
 * Can be overridden by environment variables or feature flags
 */
let globalErrorConfig: ErrorHandlingConfig = { ...DEFAULT_ERROR_CONFIG }

/**
 * Updates global error handling configuration
 */
export function setErrorHandlingConfig(
  config: Partial<ErrorHandlingConfig>
): void {
  globalErrorConfig = { ...globalErrorConfig, ...config }
}

/**
 * Gets current error handling configuration
 */
export function getErrorHandlingConfig(): ErrorHandlingConfig {
  return { ...globalErrorConfig }
}

/**
 * Maps common Supabase error codes to our error types
 */
export function mapSupabaseError(
  error: unknown,
  operation: string,
  context?: Record<string, unknown>
): ServiceError {
  const errorCode = (error as { code?: string })?.code
  const errorMessage =
    (error as { message?: string })?.message || 'Unknown database error'

  switch (errorCode) {
    case 'PGRST116':
      return new NotFoundError(`Resource not found during ${operation}`, {
        ...context,
        supabaseError: error,
      })

    case '23505': // unique_violation
      return new ValidationError(`Duplicate entry during ${operation}`, {
        ...context,
        supabaseError: error,
      })

    case '23503': // foreign_key_violation
      return new ValidationError(`Invalid reference during ${operation}`, {
        ...context,
        supabaseError: error,
      })

    case '23514': // check_violation
      return new ValidationError(`Data validation failed during ${operation}`, {
        ...context,
        supabaseError: error,
      })

    case '42501': // insufficient_privilege
      return new AuthError(`Insufficient permissions for ${operation}`, {
        ...context,
        supabaseError: error,
      })

    case 'PGRST103': // insufficient RLS
      return new AuthError(`Access denied for ${operation}`, {
        ...context,
        supabaseError: error,
      })

    default:
      return new DatabaseError(
        `Database error during ${operation}: ${errorMessage}`,
        { ...context, supabaseError: error }
      )
  }
}

/**
 * Logs error in backward-compatible format
 */
export function logErrorLegacy(operation: string, error: unknown): void {
  const config = getErrorHandlingConfig()

  if (config.logToConsole) {
    // Maintain exact same console.error format as before
    console.error(`Error ${operation}:`, error)
  }

  // If custom logger is configured, use it too
  if (config.logger && error instanceof ServiceError) {
    config.logger(error)
  }
}

/**
 * Handles errors in backward-compatible way
 * Returns null for single items, empty array for collections
 */
export function handleErrorLegacy<T>(
  operation: string,
  error: unknown,
  returnType: 'single' | 'array' = 'single'
): T | null | T[] {
  const config = getErrorHandlingConfig()

  // Log error for backward compatibility
  logErrorLegacy(operation, error)

  // If new error handling is disabled, use legacy behavior
  if (!config.enabled) {
    return returnType === 'array' ? ([] as T[]) : null
  }

  // Map to standardized error
  const serviceError =
    error instanceof ServiceError ? error : mapSupabaseError(error, operation)

  // If configured to throw, re-throw the error
  if (config.throwErrors) {
    throw serviceError
  }

  // Otherwise return appropriate default value
  return returnType === 'array' ? ([] as T[]) : null
}
