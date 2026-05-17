/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals'
import { NextRequest } from 'next/server'

type JsonInit = { status?: number } | undefined
const jsonMock = jest.fn((body: any, init?: JsonInit) => ({
  status: init?.status ?? 200,
  body,
}))

jest.mock('next/server', () => ({
  __esModule: true,
  NextResponse: {
    json: (body: any, init?: JsonInit) => jsonMock(body, init),
  },
  NextRequest:
    jest.requireActual<typeof import('next/server')>('next/server').NextRequest,
}))

const createApiClientMock = jest.fn()
const requireUserFromRequestMock = jest.fn()
const getServiceRoleClientMock = jest.fn()
const checkRateLimitMock = jest.fn()
const ensureProfileMock = jest.fn()
const noStoreJsonMock = jest.fn((data) => data)

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createApiClient: (...args: unknown[]) => createApiClientMock(...args),
}))

jest.mock('@/lib/supabase/service-role-client', () => ({
  __esModule: true,
  getServiceRoleClient: (...args: unknown[]) =>
    getServiceRoleClientMock(...args),
}))

jest.mock('@/lib/api/auth', () => ({
  __esModule: true,
  requireUserFromRequest: (...args: unknown[]) =>
    requireUserFromRequestMock(...args),
}))

jest.mock('@/lib/auth/ensure-profile', () => ({
  __esModule: true,
  ensureUserProfileForCurrentClerkUser: (...args: unknown[]) =>
    ensureProfileMock(...args),
}))

jest.mock('@/lib/api/cache-control', () => ({
  __esModule: true,
  noStoreJson: (...args: unknown[]) => noStoreJsonMock(...args),
}))

jest.mock('@/lib/middleware/rateLimiter', () => ({
  __esModule: true,
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  rateLimitKey: (scope: string, identifier: string) => `${scope}:${identifier}`,
}))

const USER_ID = '00000000-0000-0000-0000-000000000001'
const HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000002'

const apiClientMock = { auth: { getUser: jest.fn() } }

const createQuery = (terminal: 'maybeSingle' | 'then', result: unknown) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(resolve(result)),
  }
  if (terminal === 'then') {
    chain.maybeSingle = jest.fn()
  }
  return chain
}

describe('POST /api/households/join', () => {
  let route: typeof import('@/app/api/households/join/route')
  let serviceRoleMock: { from: jest.Mock }

  beforeAll(async () => {
    route = await import('@/app/api/households/join/route')
  })

  beforeEach(() => {
    jest.clearAllMocks()
    jsonMock.mockImplementation((body, init) => ({
      status: init?.status ?? 200,
      body,
    }))
    noStoreJsonMock.mockImplementation((data) => data)
    createApiClientMock.mockReturnValue(apiClientMock)
    requireUserFromRequestMock.mockResolvedValue({
      user: { id: USER_ID },
      response: null,
    })
    checkRateLimitMock.mockResolvedValue(null)
    serviceRoleMock = { from: jest.fn() }
    getServiceRoleClientMock.mockResolvedValue(serviceRoleMock)
  })

  test('updates only the authenticated profile with service-role after validating the household', async () => {
    const existingProfile = { id: USER_ID, household_id: null }
    const household = { id: HOUSEHOLD_ID }
    const updatedProfile = { id: USER_ID, household_id: HOUSEHOLD_ID }
    const existingProfileQuery = createQuery('maybeSingle', {
      data: existingProfile,
      error: null,
    })
    const householdQuery = createQuery('maybeSingle', {
      data: household,
      error: null,
    })
    const updateQuery = createQuery('maybeSingle', {
      data: updatedProfile,
      error: null,
    })

    serviceRoleMock.from.mockImplementation((table: string) => {
      if (
        table === 'user_profiles' &&
        serviceRoleMock.from.mock.calls.length === 1
      ) {
        return existingProfileQuery
      }
      if (table === 'households') return householdQuery
      if (table === 'user_profiles') return updateQuery
      return createQuery('maybeSingle', { data: null, error: null })
    })

    const response = await route.POST(
      new NextRequest('http://localhost/api/households/join', {
        method: 'POST',
        body: JSON.stringify({ household_id: HOUSEHOLD_ID }),
      })
    )

    expect(getServiceRoleClientMock).toHaveBeenCalledWith({
      approvedCapability: 'clerk-household-write',
    })
    expect(updateQuery.update).toHaveBeenCalledWith({
      household_id: HOUSEHOLD_ID,
    })
    expect(updateQuery.eq).toHaveBeenCalledWith('id', USER_ID)
    expect(noStoreJsonMock).toHaveBeenCalledWith({ profile: updatedProfile })
    expect(response).toEqual({ profile: updatedProfile })
  })

  test('bootstraps a Clerk id to a profile UUID before joining', async () => {
    requireUserFromRequestMock.mockResolvedValue({
      user: { id: 'user_clerk_123' },
      response: null,
    })
    ensureProfileMock.mockResolvedValue(USER_ID)

    const existingProfileQuery = createQuery('maybeSingle', {
      data: { id: USER_ID, household_id: HOUSEHOLD_ID },
      error: null,
    })
    serviceRoleMock.from.mockReturnValue(existingProfileQuery)

    await route.POST(
      new NextRequest('http://localhost/api/households/join', {
        method: 'POST',
        body: JSON.stringify({ household_id: HOUSEHOLD_ID }),
      })
    )

    expect(ensureProfileMock).toHaveBeenCalled()
    expect(existingProfileQuery.eq).toHaveBeenCalledWith('id', USER_ID)
    expect(noStoreJsonMock).toHaveBeenCalledWith({
      profile: { id: USER_ID, household_id: HOUSEHOLD_ID },
    })
  })

  test('returns 400 for invalid household ids before service-role writes', async () => {
    await route.POST(
      new NextRequest('http://localhost/api/households/join', {
        method: 'POST',
        body: JSON.stringify({ household_id: 'not-a-uuid' }),
      })
    )

    const [body, init] = jsonMock.mock.calls.at(-1)!
    expect(init?.status).toBe(400)
    expect(body.error).toBe('Invalid household_id')
    expect(getServiceRoleClientMock).not.toHaveBeenCalled()
  })
})
