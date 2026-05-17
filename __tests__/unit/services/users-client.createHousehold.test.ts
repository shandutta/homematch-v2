/* eslint-disable @typescript-eslint/consistent-type-assertions */
// Cast on the global fetch override; assigning the bare jest.fn() trips
// the consistent-type-assertions rule without it.
// HOUSEHOLD-001: this test was updated when UserServiceClient.createHousehold
// stopped calling the supabase.rpc('create_household_for_user') path directly
// from the anon-key client (broken for Clerk users; see
// .gstack/qa-reports/qa-report-prod-2026-05-13-full-tour.md Section 4) and
// started posting to /api/households instead. The post-RPC household SELECT
// remains on the anon-key client because every household member is allowed
// to read their own household via RLS.
import { UserServiceClient } from '@/lib/services/users-client'

const fromMock = jest.fn()
const supabaseMock = { from: fromMock }

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => supabaseMock,
}))

const originalFetch = global.fetch
const fetchMock = jest.fn()

beforeAll(() => {
  // jsdom's default fetch rejects relative URLs; use the mock everywhere.
  global.fetch = fetchMock as unknown as typeof fetch
})

afterAll(() => {
  global.fetch = originalFetch
})

describe('UserServiceClient.createHousehold', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('POSTs the household name to /api/households and returns the API household without an anon-client reread', async () => {
    const householdId = 'house-1'
    const returnedHousehold = {
      id: householdId,
      name: 'Home',
      created_by: 'user-123',
    }

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ household: returnedHousehold }),
    })

    const result = await UserServiceClient.createHousehold({ name: 'Home' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/households',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
      })
    )
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sentBody).toEqual({ name: 'Home' })
    expect(fromMock).not.toHaveBeenCalled()
    expect(result).toEqual(returnedHousehold)
  })

  it('passes null for name when no name is provided', async () => {
    const householdId = 'house-2'
    const returnedHousehold = {
      id: householdId,
      name: null,
      created_by: 'user-456',
    }

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ household: returnedHousehold }),
    })

    const result = await UserServiceClient.createHousehold({})

    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sentBody).toEqual({ name: null })
    expect(fromMock).not.toHaveBeenCalled()
    expect(result).toEqual(returnedHousehold)
  })

  it('throws with the server error message when the API call fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'User already belongs to a household' }),
    })

    await expect(
      UserServiceClient.createHousehold({ name: 'Test' })
    ).rejects.toThrow('User already belongs to a household')

    expect(fromMock).not.toHaveBeenCalled()
  })

  it('throws when the API returns no id', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })

    await expect(
      UserServiceClient.createHousehold({ name: 'Test' })
    ).rejects.toThrow('Failed to create household: no household returned')

    expect(fromMock).not.toHaveBeenCalled()
  })

  it('joins a household through the Clerk-aware API route instead of direct anon-client profile writes', async () => {
    const updatedProfile = {
      id: 'user-1',
      household_id: 'house-1',
      email: 'qa@example.com',
    }

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ profile: updatedProfile }),
    })

    const result = await UserServiceClient.joinHousehold('user-1', 'house-1')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/households/join',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
      })
    )
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sentBody).toEqual({ household_id: 'house-1' })
    expect(fromMock).not.toHaveBeenCalled()
    expect(result).toEqual(updatedProfile)
  })
})
