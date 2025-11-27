import { UserServiceClient } from '@/lib/services/users-client'

const getSessionMock = jest.fn()
const insertMock = jest.fn()

const supabaseMock = {
  auth: { getSession: getSessionMock },
  from: jest.fn(),
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => supabaseMock,
}))

describe('UserServiceClient.createHousehold', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    supabaseMock.from.mockImplementation(() => ({
      insert: insertMock,
    }))
  })

  it('adds created_by from the current session before inserting', async () => {
    const userId = 'user-123'
    const returnedHousehold = {
      id: 'house-1',
      name: 'Home',
      created_by: userId,
    }
    let capturedPayload: any = null

    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: userId } } },
      error: null,
    })

    insertMock.mockImplementation((payload) => {
      capturedPayload = payload
      return {
        select: () => ({
          single: () =>
            Promise.resolve({ data: returnedHousehold, error: null }),
        }),
      }
    })

    const result = await UserServiceClient.createHousehold({ name: 'Home' })

    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(capturedPayload).toEqual({ name: 'Home', created_by: userId })
    expect(result).toEqual(returnedHousehold)
  })

  it('throws when no authenticated session is available', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    })

    await expect(
      UserServiceClient.createHousehold({ name: 'No Session' })
    ).rejects.toThrow('Authentication required to create a household')

    expect(insertMock).not.toHaveBeenCalled()
  })
})
