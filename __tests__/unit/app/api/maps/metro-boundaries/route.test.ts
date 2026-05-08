import { describe, test, expect, beforeEach, jest } from '@jest/globals'

const jsonMock = jest.fn((body: any, init?: any) => ({
  status: init?.status ?? 200,
  body,
  headers: init?.headers,
}))

const getServiceRoleClientMock = jest.fn<any>()
const createApiClientMock = jest.fn<any>()
const fromMock = jest.fn<any>()
const selectMock = jest.fn<any>()
const eqMock = jest.fn<any>()
const orderMock = jest.fn<any>()
const buildMeceNeighborhoodsMock = jest.fn<any>()

jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server') as Record<string, unknown>
  return {
    ...actual,
    NextResponse: {
      json: (body: any, init?: any) => jsonMock(body, init),
    },
  }
})

jest.mock('@/lib/supabase/service-role-client', () => ({
  getServiceRoleClient: (...args: unknown[]) => getServiceRoleClientMock(...args),
}))

jest.mock('@/lib/supabase/server', () => ({
  createApiClient: (...args: unknown[]) => createApiClientMock(...args),
}))

jest.mock('@/lib/maps/geometry', () => ({
  buildMeceNeighborhoods: (...args: unknown[]) =>
    buildMeceNeighborhoodsMock(...args),
}))

import { GET } from '@/app/api/maps/metro-boundaries/route'

describe('metro boundaries API route', () => {
  beforeEach(() => {
    jsonMock.mockClear()
    getServiceRoleClientMock.mockReset()
    createApiClientMock.mockReset()
    fromMock.mockReset()
    selectMock.mockReset()
    eqMock.mockReset()
    orderMock.mockReset()
    buildMeceNeighborhoodsMock.mockReset()

    orderMock.mockResolvedValue({
      data: [
        {
          id: 'n1',
          name: 'Test Neighborhood',
          city: 'Oakland',
          state: 'CA',
          bounds: null,
        },
      ],
      error: null,
    })
    eqMock.mockReturnValue({ order: orderMock })
    selectMock.mockReturnValue({ eq: eqMock })
    fromMock.mockReturnValue({ select: selectMock })
    createApiClientMock.mockReturnValue({ from: fromMock })
    getServiceRoleClientMock.mockRejectedValue(
      new Error('Unauthorized access to service role client')
    )
    buildMeceNeighborhoodsMock.mockReturnValue({
      items: [{ id: 'n1', name: 'Test Neighborhood' }],
      debug: { merged: 0 },
    })
  })

  test('serves public metro boundaries through the anon API client without service-role authorization', async () => {
    await GET(
      new Request('http://localhost/api/maps/metro-boundaries?metro=bay-area')
    )

    expect(getServiceRoleClientMock).not.toHaveBeenCalled()
    expect(createApiClientMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith('neighborhoods')
    expect(eqMock).toHaveBeenCalledWith('metro_area', 'bay-area')
    expect(orderMock).toHaveBeenCalledWith('name')

    const [body, init] = jsonMock.mock.calls[jsonMock.mock.calls.length - 1]!
    expect(init?.status ?? 200).toBe(200)
    expect(body).toEqual({
      metro: 'bay-area',
      precomputed: true,
      neighborhoods: [{ id: 'n1', name: 'Test Neighborhood' }],
      debug: undefined,
    })
  })
})
