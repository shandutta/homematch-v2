import {
  makeMockClient,
  configureMockResponse,
} from '../__mocks__/supabaseClient'
import type { Database } from '@/types/database'

describe('Typed Mock Factory', () => {
  let mockClient: ReturnType<typeof makeMockClient>

  beforeEach(() => {
    mockClient = makeMockClient()
  })

  test('should create a properly typed mock client', () => {
    expect(mockClient).toBeDefined()
    expect(mockClient.from).toBeDefined()
    expect(mockClient.auth).toBeDefined()
    expect(mockClient.storage).toBeDefined()
    expect(mockClient.realtime).toBeDefined()
  })

  test('should support chained query builder operations', async () => {
    const mockResponse = {
      data: [{ id: '1', name: 'Test Property' }],
      error: null,
    }

    configureMockResponse(mockClient, 'properties', mockResponse)

    const result = await mockClient
      .from('properties')
      .select('*')
      .eq('id', '1')
      .single()

    expect(result).toEqual(mockResponse)
    expect(mockClient.from).toHaveBeenCalledWith('properties')
  })

  test('should support all query builder methods', () => {
    const builder = mockClient.from('properties')

    // These should all return the builder for chaining
    expect(builder.select('*')).toBe(builder)
    expect(builder.insert({})).toBe(builder)
    expect(builder.update({})).toBe(builder)
    expect(builder.delete()).toBe(builder)
    expect(builder.eq('id', '1')).toBe(builder)
    expect(builder.neq('id', '1')).toBe(builder)
    expect(builder.gt('price', 100000)).toBe(builder)
    expect(builder.gte('price', 100000)).toBe(builder)
    expect(builder.lt('price', 500000)).toBe(builder)
    expect(builder.lte('price', 500000)).toBe(builder)
    expect(builder.like('address', '%street%')).toBe(builder)
    expect(builder.ilike('address', '%STREET%')).toBe(builder)
    expect(builder.in('property_type', ['house', 'condo'])).toBe(builder)
    expect(builder.contains('amenities', ['pool'])).toBe(builder)
    expect(builder.order('created_at')).toBe(builder)
    expect(builder.limit(10)).toBe(builder)
    expect(builder.range(0, 9)).toBe(builder)
  })

  test('should support terminating operations', async () => {
    const builder = mockClient.from('properties')

    const singleResult = await builder.single()
    expect(singleResult).toEqual({ data: null, error: null })

    const maybeSingleResult = await builder.maybeSingle()
    expect(maybeSingleResult).toEqual({ data: null, error: null })

    const arrayResult = await builder.then((result) => result)
    expect(arrayResult).toEqual({ data: [], error: null, count: null })
  })

  test('should support auth operations', async () => {
    const userResult = await mockClient.auth.getUser()
    expect(userResult).toEqual({ data: { user: null }, error: null })

    const sessionResult = await mockClient.auth.getSession()
    expect(sessionResult).toEqual({ data: { session: null }, error: null })

    const signInResult = await mockClient.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password',
    })
    expect(signInResult).toEqual({
      data: { user: null, session: null },
      error: null,
    })
  })

  test('should support storage operations', async () => {
    const bucket = mockClient.storage.from('test-bucket')

    const uploadResult = await bucket.upload(
      'test.jpg',
      new File([], 'test.jpg')
    )
    expect(uploadResult).toEqual({ data: null, error: null })

    const downloadResult = await bucket.download('test.jpg')
    expect(downloadResult).toEqual({ data: null, error: null })

    const publicUrlResult = bucket.getPublicUrl('test.jpg')
    expect(publicUrlResult).toEqual({ data: { publicUrl: 'mock-url' } })
  })

  test('should support RPC calls', async () => {
    const rpcResult = await mockClient.rpc('custom_function', {
      param: 'value',
    })
    expect(rpcResult).toEqual({ data: null, error: null })
  })
})
