import { InteractionService } from '@/lib/services/interactions'
import { InteractionSummary, PageResponse } from '@/types/app'
import { Property } from '@/types/database'

// Mock the global fetch function
global.fetch = jest.fn()

const mockFetch = global.fetch as jest.Mock

describe('InteractionService', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('recordInteraction', () => {
    it('should send a POST request and return the interaction', async () => {
      const mockInteraction = { id: '1', propertyId: 'prop1', type: 'liked' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, interaction: mockInteraction }),
      })

      const result = await InteractionService.recordInteraction('prop1', 'liked')

      expect(mockFetch).toHaveBeenCalledWith('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: 'prop1', type: 'liked' }),
      })
      expect(result).toEqual(mockInteraction)
    })

    it('should throw an error if the fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server Error',
      })

      await expect(
        InteractionService.recordInteraction('prop1', 'liked')
      ).rejects.toThrow('Failed to record interaction (500): Server Error')
    })
  })

  describe('getInteractionSummary', () => {
    it('should send a GET request and return the summary', async () => {
      const mockSummary: InteractionSummary = { viewed: 10, liked: 5, passed: 3 }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummary,
      })

      const result = await InteractionService.getInteractionSummary()

      expect(mockFetch).toHaveBeenCalledWith('/api/interactions?type=summary', {
        method: 'GET',
      })
      expect(result).toEqual(mockSummary)
    })

    it('should throw an error for an invalid summary payload', async () => {
      const invalidSummary = { viewed: 10, liked: 'five' } // 'five' is not a number
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidSummary,
      })

      await expect(InteractionService.getInteractionSummary()).rejects.toThrow(
        'Invalid summary payload'
      )
    })
  })

  describe('getInteractions', () => {
    it('should fetch a paginated list of interactions', async () => {
      const mockResponse: PageResponse<Property> = {
        items: [{ id: 'prop1' } as Property],
        nextCursor: 'next-cursor-string',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await InteractionService.getInteractions('liked', { limit: 5 })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/interactions?type=liked&limit=5',
        { method: 'GET' }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should include the cursor in the request when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [], nextCursor: null }),
      })

      await InteractionService.getInteractions('liked', {
        limit: 5,
        cursor: 'prev-cursor',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/interactions?type=liked&limit=5&cursor=prev-cursor',
        { method: 'GET' }
      )
    })
  })
})
