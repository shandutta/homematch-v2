import { describe, beforeEach, expect, jest, test } from '@jest/globals'

const createServiceClientMock = jest.fn()
const factoryCreateClientMock = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: (...args: unknown[]) => createServiceClientMock(...args),
}))

jest.mock('@/lib/supabase/factory', () => ({
  SupabaseClientFactory: {
    getInstance: () => ({
      createClient: (...args: unknown[]) => factoryCreateClientMock(...args),
    }),
  },
}))

describe('getServiceRoleClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('uses the gated server service client instead of the standalone factory path', async () => {
    const gatedClient = { client: 'gated-service-role' }
    createServiceClientMock.mockResolvedValue(gatedClient)

    const { getServiceRoleClient } = await import(
      '@/lib/supabase/service-role-client'
    )

    await expect(getServiceRoleClient()).resolves.toBe(gatedClient)
    expect(createServiceClientMock).toHaveBeenCalledTimes(1)
    expect(factoryCreateClientMock).not.toHaveBeenCalled()
  })

  test('propagates auth-gate errors so callers see Unauthorized', async () => {
    const gateError = new Error('Unauthorized access to service role client')
    createServiceClientMock.mockRejectedValue(gateError)

    const { getServiceRoleClient } = await import(
      '@/lib/supabase/service-role-client'
    )

    await expect(getServiceRoleClient()).rejects.toThrow(
      'Unauthorized access to service role client'
    )
    expect(createServiceClientMock).toHaveBeenCalledTimes(1)
  })
})
