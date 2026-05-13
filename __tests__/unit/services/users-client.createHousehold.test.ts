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

  it('POSTs the household name to /api/households and returns the created household', async () => {
    const householdId = 'house-1'
    const returnedHousehold = {
      id: householdId,
      name: 'Home',
      created_by: 'user-123',
    }

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: householdId }),
    })

    fromMock.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: returnedHousehold, error: null }),
        }),
      }),
    }))

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
    expect(fromMock).toHaveBeenCalledWith('households')
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
      json: async () => ({ id: householdId }),
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

    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sentBody).toEqual({ name: null })
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
    ).rejects.toThrow('Failed to create household: no ID returned')

    expect(fromMock).not.toHaveBeenCalled()
  })

  it('throws when the post-create household SELECT fails', async () => {
    const householdId = 'house-3'

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: householdId }),
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
