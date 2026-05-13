/**
 * Legacy PropertyService export for backward compatibility
 *
 * This file maintains existing import paths while delegating to the new
 * facade-based implementation. All functionality has been moved to
 * specialized services under src/lib/services/properties/
 */

// Export everything from the new facade implementation
export * from './properties/index'

// Knip 2026-05-13 cleanup dropped the unused legacy type re-exports.
// Consumers should import types directly from @/types/database or
// @/lib/schemas/property.
