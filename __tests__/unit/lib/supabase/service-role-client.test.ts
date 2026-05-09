// Phase 0/1 closure: D1-service-role-rbac
import { describe, beforeEach, expect, jest, test } from '@jest/globals'

const createServiceClientMock = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: (...args: unknown[]) => createServiceClientMock(...args),
}))

describe('getServiceRoleClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('uses the gated server service client', async () => {
    const gatedClient = { client: 'gated-service-role' }
    createServiceClientMock.mockResolvedValue(gatedClient)

    const { getServiceRoleClient } = await import(
      '@/lib/supabase/service-role-client'
    )

    await expect(getServiceRoleClient()).resolves.toBe(gatedClient)
    expect(createServiceClientMock).toHaveBeenCalledTimes(1)
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
