/**
 * Shared authentication helper utilities for Supabase
 * Used by both browser client and server middleware
 */

/**
 * Checks if an error is an invalid refresh token error from Supabase Auth.
 * This happens when a user's refresh token has expired, been revoked, or is corrupted.
 */
export const isInvalidRefreshTokenError = (error: unknown): boolean => {
  if (!error) return false

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null
  const toLowerString = (value: unknown): string | undefined =>
    typeof value === 'string' ? value.toLowerCase() : undefined

  if (!isRecord(error)) return false

  const code = toLowerString(error.code)
  const message = toLowerString(error.message) || ''

  return (
    code === 'refresh_token_not_found' ||
    code === 'invalid_refresh_token' ||
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found')
  )
}
