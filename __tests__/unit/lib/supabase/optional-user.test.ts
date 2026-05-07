import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import {
  __isMissingSupabaseConfigError,
  getOptionalServerUser,
} from '@/lib/supabase/optional-user'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const createClientMock = jest.mocked(createClient)

describe('getOptionalServerUser', () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  test('returns null when Supabase public config is missing', async () => {
    createClientMock.mockRejectedValue(
      new Error(
        "Your project's URL and Key are required to create a Supabase client!"
      )
    )

    await expect(getOptionalServerUser()).resolves.toBeNull()
  })

  test('rethrows non-configuration errors', async () => {
    createClientMock.mockRejectedValue(new Error('network exploded'))

    await expect(getOptionalServerUser()).rejects.toThrow('network exploded')
  })

  test('classifies only missing Supabase URL/key errors', () => {
    expect(
      __isMissingSupabaseConfigError(
        new Error('Your project URL and Key are required')
      )
    ).toBe(true)
    expect(__isMissingSupabaseConfigError(new Error('Invalid API key'))).toBe(
      false
    )
  })
})
