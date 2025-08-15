/**
 * Format a price number as currency
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

/**
 * Format square footage with 'sqft' suffix
 */
export function formatSquareFootage(sqft: number): string {
  return `${formatNumber(sqft)} sqft`
}

/**
 * Format bedrooms/bathrooms count
 */
export function formatRooms(count: number, type: 'bed' | 'bath'): string {
  return `${count} ${type}${count !== 1 ? 's' : ''}`
}
