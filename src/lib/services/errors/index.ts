/**
 * Error Handling Abstraction for HomeMatch v2 Services
 * 
 * Provides consistent error handling, logging, and response patterns
 * across all service implementations.
 */

import type { 
  ServiceError, 
  ServiceResponse, 
  IErrorHandler 
} from '@/lib/services/interfaces'

// ============================================================================
// ERROR TYPE INTERFACES
// ============================================================================

interface PostgrestError {
  code?: string
  message?: string
  details?: string
  hint?: string
}

interface SupabaseError {
  code?: string
  message?: string
  details?: unknown
  hint?: string
  stack?: string
}

interface ErrorWithContext {
  context?: {
    userId?: string
    [key: string]: unknown
  }
}

interface StandardError {
  code?: string
  message?: string
  details?: unknown
  hint?: string
  stack?: string
}

// Type guards for error types
function isPostgrestError(error: unknown): error is PostgrestError {
  return typeof error === 'object' && error !== null && 'code' in error
}

function isSupabaseError(error: unknown): error is SupabaseError {
  return typeof error === 'object' && error !== null && ('message' in error || 'code' in error)
}

function isErrorWithContext(error: unknown): error is ErrorWithContext {
  return typeof error === 'object' && error !== null && 'context' in error
}

function isStandardError(error: unknown): error is StandardError {
  return typeof error === 'object' && error !== null && ('message' in error || 'code' in error)
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class DatabaseError extends Error {
  public readonly code: string
  public readonly details: Record<string, unknown>
  
  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'DatabaseError'
    this.code = 'DATABASE_ERROR'
    this.details = details
  }
}

export class ValidationError extends Error {
  public readonly code: string
  public readonly details: Record<string, unknown>
  
  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ValidationError'
    this.code = 'VALIDATION_ERROR'
    this.details = details
  }
}

export class AuthenticationError extends Error {
  public readonly code: string
  public readonly details: Record<string, unknown>
  
  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'AuthenticationError'
    this.code = 'AUTHENTICATION_ERROR'
    this.details = details
  }
}

export class AuthorizationError extends Error {
  public readonly code: string
  public readonly details: Record<string, unknown>
  
  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'AuthorizationError'
    this.code = 'AUTHORIZATION_ERROR'
    this.details = details
  }
}

export class NotFoundError extends Error {
  public readonly code: string
  public readonly details: Record<string, unknown>
  
  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'NotFoundError'
    this.code = 'NOT_FOUND_ERROR'
    this.details = details
  }
}

export class ServiceUnavailableError extends Error {
  public readonly code: string
  public readonly details: Record<string, unknown>
  
  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message)
    this.name = 'ServiceUnavailableError'
    this.code = 'SERVICE_UNAVAILABLE_ERROR'
    this.details = details
  }
}

// ============================================================================
// ERROR HANDLER IMPLEMENTATION
// ============================================================================

export class ErrorHandler implements IErrorHandler {
  private static instance: ErrorHandler
  
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }
  
  /**
   * Handles and transforms errors into standardized ServiceError format
   */
  handleError(
    error: unknown,
    serviceName: string,
    methodName: string,
    args?: unknown[]
  ): ServiceError {
    const baseError: ServiceError = {
      code: this.getErrorCode(error),
      message: this.getErrorMessage(error),
      details: this.getErrorDetails(error),
      context: {
        service: serviceName,
        method: methodName,
        timestamp: new Date().toISOString(),
        args: this.sanitizeArgs(args)
      }
    }
    
    // Add user context if available
    const userId = this.extractUserId(error, args)
    if (userId) {
      baseError.context!.userId = userId
    }
    
    return baseError
  }
  
  /**
   * Returns appropriate default values based on expected return type
   */
  getDefaultReturn<T>(expectedType?: T): T {
    if (expectedType === undefined || expectedType === null) {
      return null as T
    }
    
    if (typeof expectedType === 'boolean') {
      return false as T
    }
    
    if (Array.isArray(expectedType)) {
      return [] as T
    }
    
    if (typeof expectedType === 'object') {
      // For complex objects, try to determine the structure
      if ('properties' in expectedType && 'total' in expectedType) {
        // Looks like a search result
        return {
          properties: [],
          total: 0,
          page: 1,
          limit: 20
        } as T
      }
      
      return null as T
    }
    
    if (typeof expectedType === 'number') {
      return 0 as T
    }
    
    if (typeof expectedType === 'string') {
      return '' as T
    }
    
    return null as T
  }
  
  /**
   * Extracts error code from various error types
   */
  private getErrorCode(error: unknown): string {
    if (isStandardError(error) && error.code) {
      return error.code
    }
    
    if (error instanceof DatabaseError) return 'DATABASE_ERROR'
    if (error instanceof ValidationError) return 'VALIDATION_ERROR'
    if (error instanceof AuthenticationError) return 'AUTHENTICATION_ERROR'
    if (error instanceof AuthorizationError) return 'AUTHORIZATION_ERROR'
    if (error instanceof NotFoundError) return 'NOT_FOUND_ERROR'
    if (error instanceof ServiceUnavailableError) return 'SERVICE_UNAVAILABLE_ERROR'
    
    // Supabase specific error codes
    if (isPostgrestError(error)) {
      if (error.code === 'PGRST116') return 'NOT_FOUND'
      if (error.code === 'PGRST301') return 'AUTHENTICATION_REQUIRED'
      if (error.code === 'PGRST302') return 'AUTHORIZATION_FAILED'
    }
    
    return 'UNKNOWN_ERROR'
  }
  
  /**
   * Extracts human-readable error message
   */
  private getErrorMessage(error: unknown): string {
    if (isStandardError(error) && error.message) {
      return error.message
    }
    
    if (typeof error === 'string') {
      return error
    }
    
    return 'An unknown error occurred'
  }
  
  /**
   * Extracts error details for debugging
   */
  private getErrorDetails(error: unknown): Record<string, unknown> {
    const details: Record<string, unknown> = {}
    
    if (isSupabaseError(error)) {
      if (error.details) {
        details.originalDetails = error.details
      }
      
      if (error.hint) {
        details.hint = error.hint
      }
      
      if (error.code) {
        details.originalCode = error.code
      }
      
      if (error.stack && process.env.NODE_ENV === 'development') {
        details.stack = error.stack
      }
    }
    
    return details
  }
  
  /**
   * Sanitizes arguments to prevent logging sensitive data
   */
  private sanitizeArgs(args?: unknown[]): unknown[] {
    if (!args) return []
    
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        const sanitized: Record<string, unknown> = {}
        
        for (const [key, value] of Object.entries(arg)) {
          // Skip sensitive fields
          if (this.isSensitiveField(key)) {
            sanitized[key] = '[REDACTED]'
          } else if (typeof value === 'string' && value.length > 100) {
            sanitized[key] = value.substring(0, 100) + '...'
          } else {
            sanitized[key] = value
          }
        }
        
        return sanitized
      }
      
      return arg
    })
  }
  
  /**
   * Checks if a field contains sensitive data
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'auth',
      'session',
      'cookie'
    ]
    
    return sensitiveFields.some(sensitive => 
      fieldName.toLowerCase().includes(sensitive)
    )
  }
  
  /**
   * Attempts to extract user ID from error context
   */
  private extractUserId(error: unknown, args?: unknown[]): string | undefined {
    // Try to extract from error context
    if (isErrorWithContext(error) && error.context?.userId) {
      return error.context.userId
    }
    
    // Try to extract from arguments
    if (args) {
      for (const arg of args) {
        if (typeof arg === 'object' && arg !== null && 'userId' in arg) {
          const userIdArg = arg as { userId: unknown }
          if (typeof userIdArg.userId === 'string') {
            return userIdArg.userId
          }
        }
      }
    }
    
    return undefined
  }
}

// ============================================================================
// ERROR HANDLING DECORATOR
// ============================================================================

/**
 * Decorator that automatically handles errors in service methods
 * Maintains backward compatibility by returning null/empty values on error
 */
export function withErrorHandling<T extends unknown[], R>(
  target: object,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
) {
  const originalMethod = descriptor.value!
  const errorHandler = ErrorHandler.getInstance()
  
  descriptor.value = async function(this: object, ...args: T): Promise<R> {
    try {
      const result = await originalMethod.apply(this, args)
      return result
    } catch (error) {
      const serviceError = errorHandler.handleError(
        error,
        target.constructor.name,
        propertyKey,
        args
      )
      
      // Log error with full context
      console.error('Service Error:', {
        service: serviceError.context?.service,
        method: serviceError.context?.method,
        code: serviceError.code,
        message: serviceError.message,
        timestamp: serviceError.context?.timestamp,
        ...(process.env.NODE_ENV === 'development' && {
          details: serviceError.details,
          args: serviceError.context?.args
        })
      })
      
      // Return appropriate default to maintain backward compatibility
      return errorHandler.getDefaultReturn<R>()
    }
  }
  
  return descriptor
}

// ============================================================================
// SERVICE RESPONSE WRAPPER
// ============================================================================

/**
 * Wraps service responses for enhanced error handling
 * Can be used for new APIs that need explicit error handling
 */
export class ServiceResponseWrapper {
  static success<T>(data: T): ServiceResponse<T> {
    return {
      data,
      error: null,
      success: true
    }
  }
  
  static error<T>(error: ServiceError): ServiceResponse<T> {
    return {
      data: null,
      error,
      success: false
    }
  }
  
  static fromTryCatch<T>(
    fn: () => Promise<T>,
    serviceName: string,
    methodName: string,
    args?: unknown[]
  ): Promise<ServiceResponse<T>> {
    return fn()
      .then(data => this.success(data))
      .catch(error => {
        const errorHandler = ErrorHandler.getInstance()
        const serviceError = errorHandler.handleError(error, serviceName, methodName, args)
        return this.error<T>(serviceError)
      })
  }
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

export interface LogContext {
  service: string
  method: string
  userId?: string
  duration?: number
  success: boolean
}

export class ServiceLogger {
  static logServiceCall(context: LogContext, details?: Record<string, unknown>) {
    const logLevel = context.success ? 'info' : 'error'
    const message = `${context.service}.${context.method}`
    
    const logData = {
      message,
      context,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    }
    
    if (logLevel === 'error') {
      console.error(logData)
    } else if (process.env.NODE_ENV === 'development') {
      console.log(logData)
    }
  }
  
  static async withLogging<T>(
    fn: () => Promise<T>,
    context: Omit<LogContext, 'success' | 'duration'>
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await fn()
      const duration = Date.now() - startTime
      
      this.logServiceCall({
        ...context,
        success: true,
        duration
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      this.logServiceCall({
        ...context,
        success: false,
        duration
      }, { error: error instanceof Error ? error.message : String(error) })
      
      throw error
    }
  }
}