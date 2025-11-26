import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import type { NextRequest } from 'next/server'

// Mock next/server before imports
jest.mock('next/server', () => {
  const makeResponse = (body: unknown, init?: { status?: number }) => {
    const status = init?.status ?? 200
    return {
      status,
      json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
      headers: new Map([['content-type', 'application/json']]),
    }
  }

  return {
    NextResponse: {
      json: (body: unknown, init?: { status?: number }) =>
        makeResponse(body, init),
    },
  }
})

// Mock Supabase with inline jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createApiClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  })),
}))

// Mock CouplesService with inline jest.fn()
jest.mock('@/lib/services/couples', () => ({
  CouplesService: {
    notifyInteraction: jest.fn(),
    checkPotentialMutualLike: jest.fn(),
  },
}))

// Import after mocks
import * as notifyRoute from '@/app/api/couples/notify/route'
import { createApiClient } from '@/lib/supabase/server'
import { CouplesService } from '@/lib/services/couples'

// Get references to the mock functions
const mockSupabaseClient = (createApiClient as jest.Mock)() as {
  auth: { getUser: jest.Mock }
  from: jest.Mock
}
const mockGetUser = mockSupabaseClient.auth.getUser
const mockSupabaseFrom = mockSupabaseClient.from
const mockNotifyInteraction = CouplesService.notifyInteraction as jest.Mock
const mockCheckPotentialMutualLike =
  CouplesService.checkPotentialMutualLike as jest.Mock

describe('/api/couples/notify route', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset the mock client for each test
    ;(createApiClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
      from: mockSupabaseFrom,
    })

    // Default mock for from() chain
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })
  })

  describe('POST', () => {
    const createRequest = (body: Record<string, unknown>) =>
      ({
        json: async () => body,
      }) as unknown as NextRequest

    it('returns 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = createRequest({
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        interactionType: 'like',
      })

      const response = await notifyRoute.POST(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 400 for invalid request body (missing propertyId)', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createRequest({
        interactionType: 'like',
      })

      const response = await notifyRoute.POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid request data')
    })

    it('returns 400 for invalid propertyId format', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createRequest({
        propertyId: 'not-a-uuid',
        interactionType: 'like',
      })

      const response = await notifyRoute.POST(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Invalid request data')
    })

    it('returns 400 for invalid interactionType', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createRequest({
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        interactionType: 'invalid',
      })

      const response = await notifyRoute.POST(request)

      expect(response.status).toBe(400)
    })

    it('processes notification without mutual like', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { display_name: 'Test User' },
      }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockNotifyInteraction.mockResolvedValue(undefined)
      mockCheckPotentialMutualLike.mockResolvedValue({
        wouldBeMutual: false,
        partnerUserId: undefined,
      })

      const request = createRequest({
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        interactionType: 'like',
      })

      const response = await notifyRoute.POST(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.mutual_like_created).toBe(false)
      expect(body.notification_sent).toBe(false)
      expect(mockNotifyInteraction).toHaveBeenCalledWith(
        expect.anything(),
        'user-123',
        '550e8400-e29b-41d4-a716-446655440000',
        'like'
      )
    })

    it('processes notification with mutual like created', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { display_name: 'Test User' },
      }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockNotifyInteraction.mockResolvedValue(undefined)
      mockCheckPotentialMutualLike.mockResolvedValue({
        wouldBeMutual: true,
        partnerUserId: 'partner-456',
      })

      // Mock property fetch for notification
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                address: '123 Main St',
                price: 500000,
                images: ['img1.jpg'],
              },
              error: null,
            }),
          }),
        }),
      })

      const request = createRequest({
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        interactionType: 'like',
      })

      const response = await notifyRoute.POST(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.mutual_like_created).toBe(true)
      expect(body.notification_sent).toBe(true)
      expect(body.partner_user_id).toBe('partner-456')
    })

    it('handles view interaction type (no mutual like)', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockNotifyInteraction.mockResolvedValue(undefined)
      mockCheckPotentialMutualLike.mockResolvedValue({
        wouldBeMutual: true,
        partnerUserId: 'partner-456',
      })

      const request = createRequest({
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        interactionType: 'view',
      })

      const response = await notifyRoute.POST(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.mutual_like_created).toBe(false) // Only likes create mutual
      expect(body.notification_sent).toBe(false)
    })

    it('handles skip interaction type', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockNotifyInteraction.mockResolvedValue(undefined)
      mockCheckPotentialMutualLike.mockResolvedValue({
        wouldBeMutual: false,
        partnerUserId: undefined,
      })

      const request = createRequest({
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        interactionType: 'skip',
      })

      const response = await notifyRoute.POST(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(mockNotifyInteraction).toHaveBeenCalledWith(
        expect.anything(),
        'user-123',
        '550e8400-e29b-41d4-a716-446655440000',
        'skip'
      )
    })

    it('handles dislike interaction type', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockNotifyInteraction.mockResolvedValue(undefined)
      mockCheckPotentialMutualLike.mockResolvedValue({
        wouldBeMutual: false,
        partnerUserId: undefined,
      })

      const request = createRequest({
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        interactionType: 'dislike',
      })

      const response = await notifyRoute.POST(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
    })

    it('returns 500 when service throws an error', async () => {
      const mockUser = { id: 'user-error', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      mockNotifyInteraction.mockRejectedValue(new Error('Service error'))

      const request = createRequest({
        propertyId: '550e8400-e29b-41d4-a716-446655440000',
        interactionType: 'like',
      })

      const response = await notifyRoute.POST(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to process notification')
    })
  })
})
