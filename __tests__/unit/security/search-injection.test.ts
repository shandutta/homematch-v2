import { PropertySearchService } from '@/lib/services/properties/search'

type QueryResult = { data: unknown[]; error: null }
type MockQueryBuilder = {
  select: jest.MockedFunction<() => MockQueryBuilder>
  eq: jest.MockedFunction<() => MockQueryBuilder>
  or: jest.MockedFunction<(filters: string) => MockQueryBuilder>
  order: jest.MockedFunction<() => MockQueryBuilder>
  limit: jest.MockedFunction<() => MockQueryBuilder>
  then: jest.MockedFunction<
    <TResult>(
      onFulfilled: (value: QueryResult) => TResult | PromiseLike<TResult>,
      onRejected?: (reason: unknown) => TResult | PromiseLike<TResult>
    ) => Promise<TResult>
  >
}

const createMockQueryBuilder = (
  resolvedResult: QueryResult
): MockQueryBuilder => {
  const builder: MockQueryBuilder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    or: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    then: jest.fn((onFulfilled, onRejected) =>
      Promise.resolve(resolvedResult).then(onFulfilled, onRejected)
    ),
  }

  return builder
}

describe('PropertySearchService Security Tests', () => {
  let service: PropertySearchService
  let mockSupabase: {
    from: jest.MockedFunction<(table: string) => MockQueryBuilder>
  }

  beforeEach(() => {
    const resolvedResult: QueryResult = { data: [], error: null }
    const mockQueryBuilder = createMockQueryBuilder(resolvedResult)

    mockSupabase = {
      from: jest.fn().mockReturnValue(mockQueryBuilder),
    }
    service = new PropertySearchService()
    Reflect.set(
      service,
      'getSupabase',
      jest.fn().mockResolvedValue(mockSupabase)
    )
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
