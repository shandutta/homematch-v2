import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import {
  AuthError,
  DatabaseError,
  DEFAULT_ERROR_CONFIG,
  ErrorSeverity,
  NotFoundError,
  ServiceError,
  ValidationError,
  getErrorHandlingConfig,
  handleErrorLegacy,
  logErrorLegacy,
  mapSupabaseError,
  setErrorHandlingConfig,
} from '@/lib/services/errors'

describe('service errors', () => {
  beforeEach(() => {
    setErrorHandlingConfig({ ...DEFAULT_ERROR_CONFIG })
  })

  it('formats log objects from ServiceError', () => {
    const error = new DatabaseError('DB issue', { table: 'users' })
    const logObject = error.toLogObject()

    expect(logObject.name).toBe('DatabaseError')
    expect(logObject.code).toBe('DATABASE_ERROR')
    expect(logObject.context).toEqual({ table: 'users' })
    expect(logObject.timestamp).toBeDefined()
  })

  it('maps Supabase codes to typed errors', () => {
    const notFound = mapSupabaseError({ code: 'PGRST116' }, 'fetch')
    const validation = mapSupabaseError({ code: '23505' }, 'insert')
    const auth = mapSupabaseError({ code: '42501' }, 'read')
    const fallback = mapSupabaseError(
      { code: 'UNKNOWN', message: 'boom' },
      'op'
    )

    expect(notFound).toBeInstanceOf(NotFoundError)
    expect(validation).toBeInstanceOf(ValidationError)
    expect(auth).toBeInstanceOf(AuthError)
    expect(fallback).toBeInstanceOf(DatabaseError)
  })

  it('allows updating error handling config', () => {
    setErrorHandlingConfig({
      logToConsole: false,
      preserveLegacyMessages: false,
    })
    const config = getErrorHandlingConfig()

    expect(config.logToConsole).toBe(false)
    expect(config.preserveLegacyMessages).toBe(false)
    expect(config.enabled).toBe(true)
  })

  it('logs legacy errors and forwards to custom logger', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const logger = jest.fn()
    setErrorHandlingConfig({ logToConsole: true, logger })

    const error = new ValidationError('Bad input')
    logErrorLegacy('saving', error)

    expect(consoleSpy).toHaveBeenCalledWith('Error saving:', error)
    expect(logger).toHaveBeenCalledWith(error)

    consoleSpy.mockRestore()
  })

  it('returns legacy defaults when disabled', () => {
    setErrorHandlingConfig({ enabled: false })

    const result = handleErrorLegacy('fetch', new Error('boom'), 'single')
    const listResult = handleErrorLegacy('fetch', new Error('boom'), 'array')

    expect(result).toBeNull()
    expect(listResult).toEqual([])
  })

  it('throws mapped errors when configured', () => {
    setErrorHandlingConfig({ throwErrors: true })

    expect(() =>
      handleErrorLegacy('fetch', { code: 'PGRST116' }, 'single')
    ).toThrow(ServiceError)
  })

  it('returns defaults when not throwing', () => {
    setErrorHandlingConfig({ throwErrors: false })

    const result = handleErrorLegacy('fetch', { code: '23503' }, 'single')
    const listResult = handleErrorLegacy('fetch', { code: '23514' }, 'array')

    expect(result).toBeNull()
    expect(listResult).toEqual([])
  })

  it('exposes severity enum values', () => {
    expect(ErrorSeverity.HIGH).toBe('high')
  })
})
