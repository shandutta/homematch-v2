/**
 * Properties Service Module Entry Point
 *
 * Provides both the full facade and individual specialized services.
 * Maintains backward compatibility with existing PropertyService imports.
 */

export { PropertyServiceFacade as PropertyService } from './facade'

// Knip 2026-05-13 cleanup dropped the unused interface re-exports.
// Consumers should import directly from @/lib/services/interfaces.
