import { PropertySearchService } from '@/lib/services/properties/search'
import type { ISupabaseClientFactory } from '@/lib/services/interfaces'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('PropertySearchService Security Tests', () => {
  let service: PropertySearchService
  let mockSupabase: any
  let mockClientFactory: ISupabaseClientFactory

  beforeEach(() => {
    const resolvedResult = { data: [], error: null }
    // Mock Supabase query builder
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest.fn((onFulfilled, onRejected) =>
        Promise.resolve(resolvedResult).then(onFulfilled, onRejected)
      ),
    }

    mockSupabase = {
      from: jest.fn().mockReturnValue(mockQueryBuilder),
    }

    mockClientFactory = {
      createClient: jest.fn().mockResolvedValue(mockSupabase as SupabaseClient),
    }

    service = new PropertySearchService(mockClientFactory)
  })

  describe('searchPropertiesText', () => {
    it('should execute a safe query correctly', async () => {
      const query = 'modern home'
      await service.searchPropertiesText(query)

      const orCall = mockSupabase.from().or.mock.calls[0][0]
      expect(orCall).toContain(query)
      // Verify sanitization didn't alter safe query
      expect(orCall).toContain(`address.ilike.%${query}%`)
    })

    it('should sanitize injection attempts with commas', async () => {
      const maliciousQuery = 'modern, is_active.eq.false'
      await service.searchPropertiesText(maliciousQuery)

      const orCall = mockSupabase.from().or.mock.calls[0][0]
      const addressFilter =
        orCall.match(/address\.ilike\.%(.+?)%/)?.[1] ?? orCall
      // Should not include raw commas from user input
      expect(addressFilter).not.toContain(',')
      // Should contain sanitized version (comma replaced by space)
      expect(addressFilter).toBe('modern  is_active.eq.false')
    })

    it('should sanitize injection attempts with parentheses', async () => {
      const maliciousQuery = 'modern) or (id.eq.123'
      await service.searchPropertiesText(maliciousQuery)

      const orCall = mockSupabase.from().or.mock.calls[0][0]
      // Should not contain parentheses
      expect(orCall).not.toContain('(')
      expect(orCall).not.toContain(')')
      // Should contain sanitized version
      expect(orCall).toContain('modern  or  id.eq.123')
    })

    it('should return empty array for query that becomes empty after sanitization', async () => {
      const maliciousQuery = '(),,'
      const result = await service.searchPropertiesText(maliciousQuery)

      expect(result).toEqual([])
      // Should not execute query
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should trim whitespace from sanitized query', async () => {
      const query = '  modern  '
      await service.searchPropertiesText(query)

      const orCall = mockSupabase.from().or.mock.calls[0][0]
      expect(orCall).toContain('address.ilike.%modern%')
    })
  })
})
