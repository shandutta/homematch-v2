import { InteractionService } from '@/lib/services/interactions'
import type {
  InteractionSummary,
  PageResponse,
  InteractionType,
} from '@/types/app'
import type { Property } from '@/lib/schemas/property'

const originalFetch = global.fetch
type FetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>
type FetchMock = jest.MockedFunction<FetchFn>

const createFetchMock = (response: Response) => {
  const fetchMock: FetchMock = jest.fn()
  fetchMock.mockResolvedValue(response)
  global.fetch = fetchMock
  return fetchMock
}

const mockProperty: Property = {
  id: '00000000-0000-0000-0000-000000000001',
  zpid: 'zpid-1',
  address: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  zip_code: '94102',
  price: 500000,
  bedrooms: 3,
  bathrooms: 2,
  square_feet: 1500,
  property_type: 'single_family',
  images: ['https://example.com/image1.jpg'],
  description: 'Beautiful home',
  coordinates: { lat: 37.7749, lng: -122.4194 },
  neighborhood_id: null,
  amenities: ['parking'],
  year_built: 2000,
  lot_size_sqft: 5000,
  parking_spots: 2,
  listing_status: 'active',
  property_hash: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('InteractionService', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  describe('recordInteraction', () => {
    test('success: resolves without error', async () => {
      const fetchMock = createFetchMock(
        new Response(JSON.stringify({ ok: true }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      await expect(
        InteractionService.recordInteraction('p1', 'liked')
      ).resolves.toBeUndefined()
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/interactions',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })
      )
      const init = fetchMock.mock.calls[0]?.[1]
      const body =
        init && typeof init.body === 'string' ? JSON.parse(init.body) : null
      expect(body).toEqual({ propertyId: 'p1', type: 'liked' })
    })

    test('error: throws with status and body text', async () => {
      createFetchMock(new Response('Internal error', { status: 500 }))

      await expect(
        InteractionService.recordInteraction('p1', 'viewed')
      ).rejects.toThrow('Failed to record interaction (500): Internal error')
    })
  })

  describe('getInteractionSummary', () => {
    test('success: returns parsed summary', async () => {
      const mockSummary: InteractionSummary = {
        viewed: 10,
        liked: 5,
        passed: 2,
      }

      createFetchMock(
        new Response(JSON.stringify(mockSummary), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const res = await InteractionService.getInteractionSummary()
      expect(res).toEqual(mockSummary)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/interactions?type=summary',
        { method: 'GET', credentials: 'include' }
      )
    })

    test('error: throws on non-2xx', async () => {
      createFetchMock(new Response('Not found', { status: 404 }))

      await expect(InteractionService.getInteractionSummary()).rejects.toThrow(
        'Failed to fetch interaction summary (404): Not found'
      )
    })

    test('error: throws on invalid payload shape', async () => {
      // Missing a required key or wrong type triggers zod failure
      createFetchMock(
        new Response(JSON.stringify({ viewed: 1, liked: 'oops', passed: 0 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      await expect(InteractionService.getInteractionSummary()).rejects.toThrow(
        'Invalid summary payload'
      )
    })
  })

  describe('getInteractions', () => {
    test('success: builds query params and returns page response', async () => {
      const mockResponse: PageResponse<Property> = {
        items: [
          mockProperty,
          { ...mockProperty, id: '00000000-0000-0000-0000-000000000002' },
        ],
        nextCursor: 'cursor-2',
      }

      const fetchMock = createFetchMock(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const res = await InteractionService.getInteractions('viewed', {
        cursor: 'cursor-1',
        limit: 25,
      })
      expect(res).toEqual(mockResponse)

      const urlArg = fetchMock.mock.calls[0]?.[0]
      const urlCalled =
        typeof urlArg === 'string' ? urlArg : urlArg?.toString() || ''
      expect(urlCalled).toContain('/api/interactions?')
      // Verify params
      const qs = urlCalled.split('?')[1]
      const params = new URLSearchParams(qs)
      expect(params.get('type')).toBe('viewed')
      expect(params.get('cursor')).toBe('cursor-1')
      expect(params.get('limit')).toBe('25')
    })

    test('success: omits cursor when not provided, defaults limit to 12', async () => {
      const mockResponse: PageResponse<Property> = {
        items: [mockProperty],
        nextCursor: null,
      }

      const fetchMock = createFetchMock(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      await InteractionService.getInteractions('liked', {})
      const urlArg = fetchMock.mock.calls[0]?.[0]
      const urlCalled =
        typeof urlArg === 'string' ? urlArg : urlArg?.toString() || ''
      const qs = urlCalled.split('?')[1]
      const params = new URLSearchParams(qs)
      expect(params.get('type')).toBe('liked')
      expect(params.get('cursor')).toBeNull()
      expect(params.get('limit')).toBe('12')
    })

    test('error: throws with status and body', async () => {
      createFetchMock(new Response('Bad request', { status: 400 }))

      const passed: InteractionType = 'skip'
      await expect(
        InteractionService.getInteractions(passed, { limit: 5 })
      ).rejects.toThrow('Failed to fetch interactions (400): Bad request')
    })
  })

  describe('deleteInteraction', () => {
    test('success: sends DELETE with body', async () => {
      const fetchMock = createFetchMock(new Response(null, { status: 200 }))

      await InteractionService.deleteInteraction('prop-1')

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/interactions',
        expect.objectContaining({
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        })
      )
      const init = fetchMock.mock.calls[0]?.[1]
      const body =
        init && typeof init.body === 'string' ? JSON.parse(init.body) : null
      expect(body).toEqual({ propertyId: 'prop-1' })
    })

    test('error: throws on non-2xx response', async () => {
      createFetchMock(new Response('Forbidden', { status: 403 }))

      await expect(
        InteractionService.deleteInteraction('prop-2')
      ).rejects.toThrow('Failed to delete interaction (403): Forbidden')
    })
  })
})
