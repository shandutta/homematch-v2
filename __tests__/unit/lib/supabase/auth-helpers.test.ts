import { describe, test, expect } from '@jest/globals'
import { isInvalidRefreshTokenError } from '@/lib/supabase/auth-helpers'

describe('isInvalidRefreshTokenError', () => {
  describe('error code detection', () => {
    test('returns true for refresh_token_not_found code', () => {
      const error = { code: 'refresh_token_not_found', message: '' }
      expect(isInvalidRefreshTokenError(error)).toBe(true)
    })

    test('returns true for invalid_refresh_token code', () => {
      const error = { code: 'invalid_refresh_token', message: '' }
      expect(isInvalidRefreshTokenError(error)).toBe(true)
    })

    test('handles uppercase error codes', () => {
      const error = { code: 'REFRESH_TOKEN_NOT_FOUND', message: '' }
      expect(isInvalidRefreshTokenError(error)).toBe(true)
    })

    test('handles mixed case error codes', () => {
      const error = { code: 'Invalid_Refresh_Token', message: '' }
      expect(isInvalidRefreshTokenError(error)).toBe(true)
    })
  })

  describe('error message detection', () => {
    test('returns true for "invalid refresh token" message', () => {
      const error = { message: 'invalid refresh token' }
      expect(isInvalidRefreshTokenError(error)).toBe(true)
    })

    test('returns true for "refresh token not found" message', () => {
      const error = { message: 'refresh token not found' }
      expect(isInvalidRefreshTokenError(error)).toBe(true)
    })

    test('handles message with additional context', () => {
      const error = {
        message: 'Invalid Refresh Token: Refresh Token Not Found',
      }
      expect(isInvalidRefreshTokenError(error)).toBe(true)
    })

    test('handles uppercase messages', () => {
      const error = { message: 'INVALID REFRESH TOKEN' }
      expect(isInvalidRefreshTokenError(error)).toBe(true)
    })

    test('handles message with code prefix', () => {
      const error = {
        message: 'AuthApiError: Invalid Refresh Token',
      }
      expect(isInvalidRefreshTokenError(error)).toBe(true)
    })
  })

  describe('edge cases', () => {
    test('returns false for null', () => {
      expect(isInvalidRefreshTokenError(null)).toBe(false)
    })

    test('returns false for undefined', () => {
      expect(isInvalidRefreshTokenError(undefined)).toBe(false)
    })

    test('returns false for empty object', () => {
      expect(isInvalidRefreshTokenError({})).toBe(false)
    })

    test('returns false for unrelated auth errors', () => {
      const error = { code: 'invalid_credentials', message: 'Wrong password' }
      expect(isInvalidRefreshTokenError(error)).toBe(false)
    })

    test('returns false for generic errors', () => {
      const error = new Error('Something went wrong')
      expect(isInvalidRefreshTokenError(error)).toBe(false)
    })

    test('returns false for errors with only unrelated code', () => {
      const error = { code: 'session_expired' }
      expect(isInvalidRefreshTokenError(error)).toBe(false)
    })

    test('returns false for errors with only unrelated message', () => {
      const error = { message: 'User not found' }
      expect(isInvalidRefreshTokenError(error)).toBe(false)
    })

    test('handles error with only code (no message)', () => {
      const error = { code: 'refresh_token_not_found' }
      expect(isInvalidRefreshTokenError(error)).toBe(true)
    })

    test('handles error with only message (no code)', () => {
      const error = { message: 'refresh token not found' }
      expect(isInvalidRefreshTokenError(error)).toBe(true)
    })

    test('handles AuthApiError-like object', () => {
      const error = {
        code: 'refresh_token_not_found',
        message: 'Invalid Refresh Token: Refresh Token Not Found',
        status: 400,
        name: 'AuthApiError',
      }
      expect(isInvalidRefreshTokenError(error)).toBe(true)
    })
  })
})
