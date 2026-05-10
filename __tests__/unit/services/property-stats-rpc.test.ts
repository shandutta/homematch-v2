/**
 * @jest-environment node
 */
// Phase 0/1 closure: P1-property-stats-rpc

// Phase 0/1 closure: P1-property-stats-rpc
import { PropertySearchService } from '@/lib/services/properties/search'

describe('PropertySearchService getPropertyStats RPC aggregation', () => {
  it('uses the DB aggregation RPC instead of loading every active property row', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        total_properties: 3,
        avg_price: 500000,
        median_price: 500000,
        avg_bedrooms: 3,
        avg_bathrooms: 2,
        avg_square_feet: 1500,
        property_type_distribution: { single_family: 2, condo: 1 },
      },
      error: null,
    })
    const from = jest.fn()
    const service = new PropertySearchService()

    Reflect.set(
      service,
      'getSupabase',
      jest.fn().mockResolvedValue({ rpc, from })
    )

    const stats = await service.getPropertyStats()

    expect(rpc).toHaveBeenCalledWith('get_property_stats', {})
    expect(from).not.toHaveBeenCalled()
    expect(stats).toEqual({
      total_properties: 3,
      avg_price: 500000,
      median_price: 500000,
      avg_bedrooms: 3,
      avg_bathrooms: 2,
      avg_square_feet: 1500,
      property_type_distribution: { single_family: 2, condo: 1 },
    })
  })
})
