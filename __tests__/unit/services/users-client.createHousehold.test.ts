import { UserServiceClient } from '@/lib/services/users-client'

const rpcMock = jest.fn()
const fromMock = jest.fn()

const supabaseMock = {
  rpc: rpcMock,
  from: fromMock,
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => supabaseMock,
}))

describe('UserServiceClient.createHousehold', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls the RPC with the household name and returns the created household', async () => {
    const householdId = 'house-1'
    const returnedHousehold = {
      id: householdId,
      name: 'Home',
      created_by: 'user-123',
    }

    // Mock the RPC call
    rpcMock.mockResolvedValue({
      data: householdId,
      error: null,
    })

    // Mock the fetch after RPC
    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: returnedHousehold, error: null }),
        }),
      }),
    }))

    const result = await UserServiceClient.createHousehold({ name: 'Home' })

    expect(rpcMock).toHaveBeenCalledWith('create_household_for_user', {
      p_name: 'Home',
    })
    expect(fromMock).toHaveBeenCalledWith('households')
    expect(result).toEqual(returnedHousehold)
  })

  it('passes null for p_name when no name is provided', async () => {
    const householdId = 'house-2'
    const returnedHousehold = {
      id: householdId,
      name: null,
      created_by: 'user-456',
    }

    rpcMock.mockResolvedValue({
      data: householdId,
      error: null,
    })

    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: returnedHousehold, error: null }),
        }),
      }),
    }))

    const result = await UserServiceClient.createHousehold({})

    expect(rpcMock).toHaveBeenCalledWith('create_household_for_user', {
      p_name: null,
    })
    expect(result).toEqual(returnedHousehold)
  })

  it('throws when the RPC fails', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'Not authenticated' },
    })

    await expect(
      UserServiceClient.createHousehold({ name: 'Test' })
    ).rejects.toThrow('Failed to create household: Not authenticated')

    expect(fromMock).not.toHaveBeenCalled()
  })

  it('throws when no household ID is returned', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: null,
    })

    await expect(
      UserServiceClient.createHousehold({ name: 'Test' })
    ).rejects.toThrow('Failed to create household: no ID returned')

    expect(fromMock).not.toHaveBeenCalled()
  })

  it('throws when fetching the created household fails', async () => {
    const householdId = 'house-3'

    rpcMock.mockResolvedValue({
      data: householdId,
      error: null,
    })

    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: null,
              error: { message: 'Household not found' },
            }),
        }),
      }),
    }))

    await expect(
      UserServiceClient.createHousehold({ name: 'Test' })
    ).rejects.toThrow('Failed to fetch created household: Household not found')
  })
})
