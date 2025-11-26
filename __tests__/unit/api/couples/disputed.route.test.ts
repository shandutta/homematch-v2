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

// Import after mocks
import * as disputedRoute from '@/app/api/couples/disputed/route'
import { createApiClient } from '@/lib/supabase/server'

// Get references to the mock functions
const mockGetUser = (createApiClient as jest.Mock)().auth.getUser as jest.Mock
const mockSupabaseFrom = (createApiClient as jest.Mock)().from as jest.Mock

// Helper to create chainable mock
const createChainableMock = (finalData: unknown, finalError?: unknown) => {
  const chainMock = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: finalData,
      error: finalError,
    }),
  }
  return chainMock
}

describe('/api/couples/disputed route', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset the mock client for each test
    ;(createApiClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
      from: mockSupabaseFrom,
    })
  })

  describe('GET', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = {} as unknown as NextRequest

      const response = await disputedRoute.GET(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 404 when user has no household', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileMock = createChainableMock(
        { household_id: null, display_name: 'Test', email: 'test@example.com' },
        null
      )
      mockSupabaseFrom.mockReturnValue(profileMock)

      const request = {} as unknown as NextRequest

      const response = await disputedRoute.GET(request)

      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toBe('No household found')
    })

    it('returns empty array when household has less than 2 members', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // First call - user profile
      const profileMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                household_id: 'household-123',
                display_name: 'Test',
                email: 'test@example.com',
              },
              error: null,
            }),
          }),
        }),
      }

      // Second call - household members (only 1 member)
      const membersMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'user-123',
                display_name: 'Test',
                email: 'test@example.com',
              },
            ],
            error: null,
          }),
        }),
      }

      mockSupabaseFrom
        .mockReturnValueOnce(profileMock)
        .mockReturnValueOnce(membersMock)

      const request = {} as unknown as NextRequest

      const response = await disputedRoute.GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.disputedProperties).toEqual([])
    })

    it('returns disputed properties when conflicts exist', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // User profile
      const profileMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                household_id: 'household-123',
                display_name: 'Test User',
                email: 'test@example.com',
              },
              error: null,
            }),
          }),
        }),
      }

      // Household members
      const membersMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'user-123',
                display_name: 'Test User',
                email: 'test@example.com',
              },
              {
                id: 'partner-456',
                display_name: 'Partner',
                email: 'partner@example.com',
              },
            ],
            error: null,
          }),
        }),
      }

      // Interactions with conflicts
      const interactionsMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'int-1',
                    user_id: 'user-123',
                    property_id: 'prop-1',
                    interaction_type: 'like',
                    created_at: '2024-01-15T10:00:00Z',
                    score_data: null,
                    properties: {
                      address: '123 Main St',
                      price: 500000,
                      bedrooms: 3,
                      bathrooms: 2,
                      square_feet: 1500,
                      images: ['img1.jpg'],
                      listing_status: 'active',
                    },
                  },
                  {
                    id: 'int-2',
                    user_id: 'partner-456',
                    property_id: 'prop-1',
                    interaction_type: 'skip',
                    created_at: '2024-01-15T11:00:00Z',
                    score_data: null,
                    properties: {
                      address: '123 Main St',
                      price: 500000,
                      bedrooms: 3,
                      bathrooms: 2,
                      square_feet: 1500,
                      images: ['img1.jpg'],
                      listing_status: 'active',
                    },
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }

      mockSupabaseFrom
        .mockReturnValueOnce(profileMock)
        .mockReturnValueOnce(membersMock)
        .mockReturnValueOnce(interactionsMock)

      const request = {} as unknown as NextRequest

      const response = await disputedRoute.GET(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.disputedProperties).toHaveLength(1)
      expect(body.disputedProperties[0].property_id).toBe('prop-1')
      expect(body.disputedProperties[0].partner1.interaction_type).toBe('like')
      expect(body.disputedProperties[0].partner2.interaction_type).toBe('skip')
      expect(body.performance).toBeDefined()
    })

    it('returns 500 when interactions query fails', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const profileMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                household_id: 'household-123',
                display_name: 'Test',
                email: 'test@example.com',
              },
              error: null,
            }),
          }),
        }),
      }

      const membersMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'user-123',
                display_name: 'Test',
                email: 'test@example.com',
              },
              {
                id: 'partner-456',
                display_name: 'Partner',
                email: 'partner@example.com',
              },
            ],
            error: null,
          }),
        }),
      }

      const interactionsMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      }

      mockSupabaseFrom
        .mockReturnValueOnce(profileMock)
        .mockReturnValueOnce(membersMock)
        .mockReturnValueOnce(interactionsMock)

      const request = {} as unknown as NextRequest

      const response = await disputedRoute.GET(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to fetch property interactions')
    })
  })

  describe('PATCH', () => {
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
        property_id: 'prop-123',
        resolution_type: 'scheduled_viewing',
      })

      const response = await disputedRoute.PATCH(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 400 when property_id is missing', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createRequest({
        resolution_type: 'scheduled_viewing',
      })

      const response = await disputedRoute.PATCH(request)

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Property ID and resolution type are required')
    })

    it('returns 400 when resolution_type is missing', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createRequest({
        property_id: 'prop-123',
      })

      const response = await disputedRoute.PATCH(request)

      expect(response.status).toBe(400)
    })

    it('successfully resolves a disputed property', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = createRequest({
        property_id: 'prop-123',
        resolution_type: 'scheduled_viewing',
      })

      const response = await disputedRoute.PATCH(request)

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.property_id).toBe('prop-123')
      expect(body.resolution_type).toBe('scheduled_viewing')
      expect(body.timestamp).toBeDefined()
    })

    it('handles all valid resolution types', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const resolutionTypes = [
        'scheduled_viewing',
        'saved_for_later',
        'final_pass',
        'discussion_needed',
      ]

      for (const resolutionType of resolutionTypes) {
        const request = createRequest({
          property_id: 'prop-123',
          resolution_type: resolutionType,
        })

        const response = await disputedRoute.PATCH(request)

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body.resolution_type).toBe(resolutionType)
      }
    })

    it('returns 500 on unexpected error', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      // Create a request that throws when json() is called
      const request = {
        json: async () => {
          throw new Error('Parse error')
        },
      } as unknown as NextRequest

      const response = await disputedRoute.PATCH(request)

      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.error).toBe('Failed to update resolution')
    })
  })
})
