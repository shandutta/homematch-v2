import type { PropertyFilters } from '@/lib/schemas/property'

type NonNullFilterValue = Exclude<
  PropertyFilters[keyof PropertyFilters],
  null | undefined
>
type InFilterValues = readonly (string | number)[]
type ContainsValue = string | readonly unknown[] | Record<string, unknown>

type FilterableQuery<T> = {
  gte(column: string, value: unknown): T
  lte(column: string, value: unknown): T
  eq(column: string, value: unknown): T
  in(column: string, values: readonly unknown[]): T
  contains(column: string, value: ContainsValue): T
}

/**
 * Filter operation types supported by the PropertyFilterBuilder
 */
export type FilterOperation = 'gte' | 'lte' | 'eq' | 'in' | 'contains'

/**
 * Configuration for a single filter rule
 */
export interface FilterRule {
  /** The filter key from PropertyFilters */
  filterKey: keyof PropertyFilters
  /** The database column name */
  column: string
  /** The operation to perform */
  operation: FilterOperation
  /** Optional value transformer */
  transform?: (value: unknown) => unknown
}

/**
 * Declarative filter builder for property search queries
 *
 * Replaces repetitive conditional logic with a clean, maintainable configuration system.
 * Maintains 100% backward compatibility with existing search behavior.
 */
export class PropertyFilterBuilder {
  private readonly filterRules: FilterRule[]

  constructor() {
    // Declarative filter configuration - each rule maps a filter to a database operation
    this.filterRules = [
      // Price range filters
      { filterKey: 'price_min', column: 'price', operation: 'gte' },
      { filterKey: 'price_max', column: 'price', operation: 'lte' },

      // Bedroom range filters
      { filterKey: 'bedrooms_min', column: 'bedrooms', operation: 'gte' },
      { filterKey: 'bedrooms_max', column: 'bedrooms', operation: 'lte' },

      // Bathroom range filters
      { filterKey: 'bathrooms_min', column: 'bathrooms', operation: 'gte' },
      { filterKey: 'bathrooms_max', column: 'bathrooms', operation: 'lte' },

      // Square feet range filters
      { filterKey: 'square_feet_min', column: 'square_feet', operation: 'gte' },
      { filterKey: 'square_feet_max', column: 'square_feet', operation: 'lte' },

      // Year built range filters
      { filterKey: 'year_built_min', column: 'year_built', operation: 'gte' },
      { filterKey: 'year_built_max', column: 'year_built', operation: 'lte' },

      // Lot size range filters
      { filterKey: 'lot_size_min', column: 'lot_size_sqft', operation: 'gte' },
      { filterKey: 'lot_size_max', column: 'lot_size_sqft', operation: 'lte' },

      // Parking spots minimum filter
      {
        filterKey: 'parking_spots_min',
        column: 'parking_spots',
        operation: 'gte',
      },

      // Array-based filters
      { filterKey: 'property_types', column: 'property_type', operation: 'in' },
      {
        filterKey: 'neighborhoods',
        column: 'neighborhood_id',
        operation: 'in',
      },
      {
        filterKey: 'listing_status',
        column: 'listing_status',
        operation: 'in',
      },
    ]
  }

  /**
   * Apply all applicable filters to a Supabase query
   *
   * @param query - The base Supabase query to filter
   * @param filters - The filter criteria to apply
   * @returns The filtered query with all applicable filters applied
   */
  applyFilters<T extends FilterableQuery<T>>(
    query: T,
    filters: PropertyFilters
  ): T {
    let filteredQuery: T = query

    // Apply standard filters using declarative rules
    for (const rule of this.filterRules) {
      filteredQuery = this.applyFilter(filteredQuery, filters, rule)
    }

    // Apply special case: amenities filter (contains check for each amenity)
    if (filters.amenities && filters.amenities.length > 0) {
      filters.amenities.forEach((amenity) => {
        filteredQuery = filteredQuery.contains('amenities', [amenity])
      })
    }

    return filteredQuery
  }

  /**
   * Apply a single filter rule to the query
   *
   * @private
   */
  private applyFilter<T extends FilterableQuery<T>>(
    query: T,
    filters: PropertyFilters,
    rule: FilterRule
  ): T {
    const filterValue = filters[rule.filterKey]

    // Skip if filter value is undefined or null
    if (filterValue === undefined || filterValue === null) {
      return query
    }

    // For array filters, skip if empty
    if (Array.isArray(filterValue) && filterValue.length === 0) {
      return query
    }

    // Transform value if transformer provided
    const value = rule.transform ? rule.transform(filterValue) : filterValue

    // Apply the appropriate Supabase operation
    switch (rule.operation) {
      case 'gte':
        return query.gte(rule.column, value as NonNullFilterValue)

      case 'lte':
        return query.lte(rule.column, value as NonNullFilterValue)

      case 'eq':
        return query.eq(rule.column, value as NonNullFilterValue)

      case 'in': {
        const arrayValue = value as unknown as InFilterValues
        return query.in(rule.column, arrayValue)
      }

      case 'contains':
        return query.contains(rule.column, value as ContainsValue)

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = rule.operation
        throw new Error(`Unsupported filter operation: ${_exhaustive}`)
      }
    }
  }

  /**
   * Get all configured filter rules (useful for testing and debugging)
   *
   * @returns Array of all filter rules
   */
  getFilterRules(): readonly FilterRule[] {
    return [...this.filterRules]
  }

  /**
   * Add a new filter rule dynamically
   *
   * @param rule - The filter rule to add
   */
  addFilterRule(rule: FilterRule): void {
    this.filterRules.push(rule)
  }

  /**
   * Remove a filter rule by filter key
   *
   * @param filterKey - The filter key to remove
   */
  removeFilterRule(filterKey: keyof PropertyFilters): void {
    const index = this.filterRules.findIndex(
      (rule) => rule.filterKey === filterKey
    )
    if (index !== -1) {
      this.filterRules.splice(index, 1)
    }
  }
}

/**
 * Default singleton instance for consistent usage across the application
 */
export const propertyFilterBuilder = new PropertyFilterBuilder()
