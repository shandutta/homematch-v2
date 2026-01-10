import { InteractionService } from '@/lib/services/interactions'
import type {
  Interaction,
  InteractionSummary,
  PageResponse,
  InteractionType,
} from '@/types/app'

const originalFetch = global.fetch
type FetchMock = jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>

const createFetchMock = (response: Response) => {
  const fetchMock: FetchMock = jest.fn()
  fetchMock.mockResolvedValue(response)
  global.fetch = fetchMock
  return fetchMock
}

describe('InteractionService', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  describe('recordInteraction', () => {
    test('success: returns created interaction', async () => {
      const mockInteraction: Interaction = {
        userId: 'u1',
        propertyId: 'p1',
        type: 'liked',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const fetchMock = createFetchMock(
        new Response(JSON.stringify({ interaction: mockInteraction }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const res = await InteractionService.recordInteraction('p1', 'liked')
      expect(res).toEqual(mockInteraction)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/interactions',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      const mockResponse: PageResponse<{ id: string }> = {
        items: [{ id: 'p1' }, { id: 'p2' }],
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
      const mockResponse: PageResponse<{ id: string }> = {
        items: [{ id: 'p1' }],
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
